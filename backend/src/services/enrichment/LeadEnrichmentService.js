import { Lead } from '../../models/Lead.model.js';
import { Company } from '../../models/Company.model.js';
import { Contact } from '../../models/Contact.model.js';
import { EnrichmentJob } from '../../models/EnrichmentJob.model.js';
import { ExploriumOrganizationProvider, domainFromWebsite } from '../leadProviders/ExploriumOrganizationProvider.js';
import { ExploriumPeopleProvider } from '../leadProviders/ExploriumPeopleProvider.js';
import { ApolloOrganizationProvider } from '../leadProviders/ApolloOrganizationProvider.js';
import { researchCompany } from '../research/CompanyResearchService.js';
import { computeLeadScore } from '../../utils/leadScoring.js';
import { env } from '../../config/env.js';

const organizationProvider = new ExploriumOrganizationProvider();
const peopleProvider = new ExploriumPeopleProvider();
const apolloFallback = new ApolloOrganizationProvider();

function companySeedFromLead(lead) {
  return {
    name: lead.businessName,
    website: lead.website,
    domain: lead.website ? domainFromWebsite(lead.website) : undefined,
    industry: lead.industry,
    category: lead.category,
    phone: lead.phone,
    email: lead.email,
    headquarters: {
      address: lead.address,
      city: lead.city,
      state: lead.state,
      country: lead.country,
      postalCode: lead.postalCode,
      ...(lead.location?.coordinates ? { longitude: lead.location.coordinates[0], latitude: lead.location.coordinates[1] } : {}),
    },
    source: lead.source,
    provider: 'explorium',
  };
}

async function upsertCompanyFromLead(lead) {
  const seed = companySeedFromLead(lead);
  let company = seed.domain ? await Company.findOne({ domain: seed.domain }) : null;
  if (!company) company = await Company.findOne({ name: seed.name, 'headquarters.city': seed.headquarters.city });
  if (!company) company = new Company(seed);
  else company.set(seed);
  await company.save();
  return company;
}

async function enrichWithExplorium(company) {
  try {
    return await organizationProvider.enrich(company);
  } catch (err) {
    // Apollo remains a fallback only if explicitly configured. This prevents
    // the whole workflow from depending on Apollo after moving to Explorium.
    if (env.apolloApiKey) {
      try {
        const fallback = await apolloFallback.enrich(company);
        if (fallback.status === 'enriched') return { ...fallback, data: { ...fallback.data, provider: 'apollo' } };
      } catch {}
    }
    throw err;
  }
}

export async function runLeadEnrichment(jobId) {
  const job = await EnrichmentJob.findById(jobId);
  if (!job) return;

  const lead = await Lead.findOne({ _id: job.leadId, isDeleted: false });
  if (!lead) {
    job.status = 'failed';
    job.error = 'Lead not found';
    await job.save();
    return;
  }

  job.status = 'running';
  job.startedAt = new Date();
  await job.save();
  lead.enrichmentStatus = 'pending';
  await lead.save();

  let company;
  let companyOk = false;
  let peopleOk = false;
  let researchOk = false;

  try {
    job.status = 'company_enriching';
    job.steps.company = 'running';
    job.progress = 10;
    await job.save();

    company = await upsertCompanyFromLead(lead);
    const enrichment = await enrichWithExplorium(company);
    if (enrichment.status === 'enriched') {
      company.set(enrichment.data);
      company.provider = enrichment.data.provider || 'explorium';
      company.providerId = enrichment.providerId;
      company.sourceMeta = { source: company.provider, confidence: 'high', updatedAt: new Date() };
      company.rawProviderData = enrichment.raw;
      company.enrichmentStatus = 'enriched';
      company.enrichedAt = new Date();
      company.lastError = undefined;
      await company.save();
      companyOk = true;
    } else {
      company.enrichmentStatus = 'partial';
      company.lastError = enrichment.reason;
      await company.save();
    }

    lead.companyId = company._id;
    Object.assign(lead, {
      email: company.email || lead.email,
      phone: company.phone || lead.phone,
      website: company.website || lead.website,
      industry: company.industry || lead.industry,
    });
    lead.enrichmentStatus = companyOk ? 'company_enriched' : 'partial';
    await lead.save();
    job.companyId = company._id;
    job.steps.company = companyOk ? 'completed' : 'partial';
    job.progress = 35;
    await job.save();
  } catch (err) {
    job.steps.company = 'failed';
    job.error = err.message;
    company = company || await upsertCompanyFromLead(lead);
    company.enrichmentStatus = 'partial';
    company.lastError = err.message;
    await company.save();
    lead.companyId = company._id;
    lead.enrichmentStatus = 'partial';
    await lead.save();
    await job.save();
  }

  if (company) {
    try {
      job.status = 'people_discovering';
      job.steps.people = 'running';
      job.progress = 45;
      await job.save();

      // Explorium uses business_id as the company anchor for prospect search.
      // If company enrichment did not return one, try matching the company now.
      if (!company.providerId || company.provider !== 'explorium') {
        const matched = await organizationProvider.match(company);
        if (matched?.businessId) {
          company.providerId = matched.businessId;
          company.provider = 'explorium';
          await company.save();
        }
      }

      const people = await peopleProvider.search({
        businessId: company.provider === 'explorium' ? company.providerId : undefined,
        perPage: 25,
      });

      job.status = 'people_enriching';
      await job.save();

      let enrichedCount = 0;
      for (const discovered of people.slice(0, env.exploriumMaxPocEnrich)) {
        const existing = await Contact.findOne({ companyId: company._id, providerId: discovered.providerId });
        const contact = existing || new Contact({ companyId: company._id, leadId: lead._id, fullName: discovered.fullName });
        contact.set({
          ...discovered,
          companyId: company._id,
          leadId: lead._id,
          provider: 'explorium',
          providerId: discovered.providerId,
          rawProviderData: discovered.raw,
          enrichmentStatus: 'discovered',
        });
        await contact.save();

        try {
          const enriched = await peopleProvider.enrich(discovered);
          if (enriched) {
            contact.set({
              ...enriched,
              companyId: company._id,
              leadId: lead._id,
              provider: 'explorium',
              providerId: discovered.providerId,
              rawProviderData: enriched.raw,
              enrichmentStatus: 'enriched',
              enrichedAt: new Date(),
              sourceMeta: { source: 'explorium', confidence: 'high', updatedAt: new Date() },
            });
            await contact.save();
            enrichedCount += 1;
          }
        } catch (personErr) {
          contact.enrichmentStatus = 'partial';
          await contact.save();
          console.warn(`[explorium] contact enrichment failed for ${discovered.fullName}: ${personErr.message}`);
        }
      }

      peopleOk = people.length > 0 && enrichedCount > 0;
      job.steps.people = peopleOk ? 'completed' : people.length ? 'partial' : 'failed';
      job.progress = 75;
      await job.save();
      lead.enrichmentStatus = peopleOk ? 'contacts_enriched' : 'partial';
      await lead.save();
    } catch (err) {
      job.steps.people = 'failed';
      job.error = job.error || err.message;
      await job.save();
    }

    try {
      job.status = 'researching';
      job.steps.research = 'running';
      job.progress = 82;
      await job.save();
      await researchCompany(company);
      researchOk = true;
      job.steps.research = 'completed';
      job.progress = 92;
      await job.save();
    } catch (err) {
      job.steps.research = 'failed';
      job.error = job.error || err.message;
      await job.save();
    }
  }

  const contactsCount = company ? await Contact.countDocuments({ companyId: company._id }) : 0;
  const score = Math.min(
    100,
    computeLeadScore(lead) +
      (company?.employeeCount || company?.employeeRange ? 5 : 0) +
      (contactsCount ? 10 : 0) +
      (companyOk ? 5 : 0)
  );
  lead.leadScore = score;
  lead.enrichmentStatus = companyOk && peopleOk && researchOk ? 'enriched' : companyOk || peopleOk || researchOk ? 'partial' : 'failed';
  await lead.save();

  job.status = lead.enrichmentStatus === 'enriched' ? 'completed' : lead.enrichmentStatus === 'partial' ? 'partial' : 'failed';
  job.progress = 100;
  job.completedAt = new Date();
  await job.save();
}

export async function createEnrichmentJob(leadId) {
  const active = await EnrichmentJob.findOne({ leadId, status: { $in: ['queued', 'running', 'company_enriching', 'people_discovering', 'people_enriching', 'researching'] } });
  if (active) return active;
  return EnrichmentJob.create({ leadId, status: 'queued' });
}

export async function processQueuedEnrichmentJobs(limit = 3) {
  const jobs = await EnrichmentJob.find({ status: 'queued' }).sort({ createdAt: 1 }).limit(limit);
  for (const job of jobs) await runLeadEnrichment(job._id);
}
