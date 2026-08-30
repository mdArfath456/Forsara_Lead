import { Company } from '../models/Company.model.js';
import { Contact } from '../models/Contact.model.js';
import { CompanyProject } from '../models/CompanyProject.model.js';
import { Lead } from '../models/Lead.model.js';
import { EnrichmentJob } from '../models/EnrichmentJob.model.js';
import { createEnrichmentJob } from '../services/enrichment/LeadEnrichmentService.js';
import { Project } from '../models/Project.model.js';
import { domainFromWebsite } from '../services/leadProviders/ExploriumOrganizationProvider.js';


export async function selectCompany(req, res, next) {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Company name is required' });

    const domain = domainFromWebsite(body.domain || body.website || '');
    let company = domain ? await Company.findOne({ domain }) : null;
    if (!company) company = await Company.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') });

    if (!company) {
      company = await Company.create({
        name,
        domain: domain || undefined,
        website: body.website || (domain ? `https://${domain}` : undefined),
        industry: body.industry,
        category: body.category,
        phone: body.phone,
        headquarters: {
          address: body.address,
          city: body.city,
          state: body.state,
          country: body.country,
          postalCode: body.postalCode,
        },
        source: body.source || 'discovery',
        provider: body.source === 'explorium' ? 'explorium' : 'discovery',
        providerId: body.providerId,
      });
    } else {
      company.set({
        ...(body.website ? { website: body.website } : {}),
        ...(domain ? { domain } : {}),
        ...(body.industry ? { industry: body.industry } : {}),
        ...(body.category ? { category: body.category } : {}),
        ...(body.phone ? { phone: body.phone } : {}),
        ...(body.providerId ? { providerId: body.providerId, provider: body.source === 'explorium' ? 'explorium' : company.provider } : {}),
      });
      await company.save();
    }

    const project = await Project.create({
      name: `${name} company intelligence`,
      searchCriteria: { companyFirstSearch: true, companyId: company._id, query: name },
    });

    const lead = await Lead.create({
      businessName: company.name,
      industry: company.industry,
      category: company.category,
      phone: company.phone,
      email: company.email,
      website: company.website,
      address: company.headquarters?.address,
      city: company.headquarters?.city,
      state: company.headquarters?.state,
      country: company.headquarters?.country,
      postalCode: company.headquarters?.postalCode,
      companyId: company._id,
      source: body.source && ['google_places', 'overpass', 'foursquare', 'apollo', 'explorium', 'manual'].includes(body.source) ? body.source : 'manual',
      projectId: project._id,
    });

    project.leadCount = 1;
    await project.save();

    // Company-first UX: selecting a company immediately starts the deep
    // enrichment pipeline. The UI can show progress while the worker runs.
    const job = await createEnrichmentJob(lead._id);
    lead.enrichmentStatus = 'pending';
    await lead.save();

    res.status(201).json({ lead, company, project, job });
  } catch (err) {
    next(err);
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function getCompany(req, res, next) {
  try {
    const company = await Company.findById(req.params.id).lean();
    if (!company) return res.status(404).json({ error: 'Company not found' });
    const [contacts, projects, leads] = await Promise.all([
      Contact.find({ companyId: company._id }).sort({ seniority: 1, fullName: 1 }).lean(),
      CompanyProject.find({ companyId: company._id }).sort({ discoveredAt: -1 }).lean(),
      Lead.find({ companyId: company._id, isDeleted: false }).select('_id businessName projectId leadScore').lean(),
    ]);
    res.json({ company, contacts, projects, leads });
  } catch (err) { next(err); }
}

export async function listCompanyContacts(req, res, next) {
  try {
    const contacts = await Contact.find({ companyId: req.params.id }).sort({ createdAt: -1 }).lean();
    res.json({ contacts });
  } catch (err) { next(err); }
}

export async function listCompanyProjects(req, res, next) {
  try {
    const projects = await CompanyProject.find({ companyId: req.params.id }).sort({ discoveredAt: -1 }).lean();
    res.json({ projects });
  } catch (err) { next(err); }
}

export async function getLeadEnrichmentStatus(req, res, next) {
  try {
    const job = await EnrichmentJob.findOne({ leadId: req.params.id }).sort({ createdAt: -1 }).lean();
    if (!job) return res.json({ job: null });
    res.json({ job });
  } catch (err) { next(err); }
}

export async function enrichLead(req, res, next) {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, isDeleted: false });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    const job = await createEnrichmentJob(lead._id);
    lead.enrichmentStatus = 'pending';
    await lead.save();
    res.status(202).json({ job });
  } catch (err) { next(err); }
}
