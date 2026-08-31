import { Contact } from '../../models/Contact.model.js';
import { ApolloPeopleProvider } from '../leadProviders/ApolloPeopleProvider.js';
import { ExploriumPeopleProvider } from '../leadProviders/ExploriumPeopleProvider.js';
import { env } from '../../config/env.js';

const apolloPeople = new ApolloPeopleProvider();
const exploriumPeople = new ExploriumPeopleProvider();

const MAX_CONTACTS_PER_COMPANY = env.maxContactsPerCompany;

async function runProvider(provider, company, limit) {
    const discovery = await provider.discover(company, { limit });
    if (discovery.status !== 'discovered' || !discovery.people.length) {
        return { people: [], enriched: [] };
    }

    const enriched = [];
    for (const person of discovery.people.slice(0, limit)) {
        try {
            const result = await provider.enrichContact(person);
            if (result.enrichmentStatus === 'enriched' || result.enrichmentStatus === 'partial') {
                enriched.push({ ...person, ...result });
            }
        } catch (err) {
            console.error(`[people-discovery] ${provider.key} enrichContact failed for ${person.fullName}:`, err.message);
        }
    }
    return { people: discovery.people, enriched };
}

async function upsertContact(company, person, providerKey) {
    const filter = person.email
        ? { companyId: company._id, email: person.email.toLowerCase() }
        : { companyId: company._id, providerId: person.providerId, provider: providerKey };

    const update = {
        companyId: company._id,
        firstName: person.firstName,
        lastName: person.lastName,
        fullName: person.fullName,
        title: person.title,
        department: person.department,
        seniority: person.seniority,
        email: person.email,
        emailStatus: person.emailStatus,
        phone: person.phone,
        linkedinUrl: person.linkedinUrl,
        location: { city: person.city, state: person.state, country: person.country },
        provider: providerKey,
        providerId: person.providerId,
        enrichmentStatus: person.email || person.phone ? 'enriched' : 'partial',
        enrichedAt: new Date(),
        sourceMeta: { source: providerKey, confidence: person.email ? 'high' : 'medium', updatedAt: new Date() },
        rawProviderData: person.raw,
    };

    return Contact.findOneAndUpdate(filter, { $set: update }, { upsert: true, new: true, setDefaultsOnInsert: true });
}

/**
 * Discover + enrich POCs (name, title, email, phone) for a company.
 * Tries Apollo People Search/Match first; if Apollo finds nothing usable
 * (no key configured, no people matched, or zero contacts with an email/
 * phone revealed), falls back to Explorium's Prospect API end to end.
 */
export async function discoverAndEnrichPeople(company, { limit = MAX_CONTACTS_PER_COMPANY } = {}) {
    let providerUsed = 'apollo';
    let result = { people: [], enriched: [] };

    try {
        result = await runProvider(apolloPeople, company, limit);
    } catch (err) {
        console.error('[people-discovery] Apollo discovery failed, falling back to Explorium:', err.message);
    }

    if (!result.enriched.length) {
        providerUsed = 'explorium';
        try {
            result = await runProvider(exploriumPeople, company, limit);
        } catch (err) {
            console.error('[people-discovery] Explorium fallback also failed:', err.message);
            return { status: 'failed', provider: providerUsed, contactsSaved: 0 };
        }
    }

    if (!result.enriched.length) {
        return { status: 'no_results', provider: providerUsed, contactsSaved: 0 };
    }

    const saved = [];
    for (const person of result.enriched) {
        try {
            saved.push(await upsertContact(company, person, providerUsed));
        } catch (err) {
            console.error(`[people-discovery] Failed to save contact ${person.fullName}:`, err.message);
        }
    }

    return { status: saved.length ? 'enriched' : 'failed', provider: providerUsed, contactsSaved: saved.length };
}