import { apolloRequest } from './apolloClient.js';
import { domainFromWebsite } from './ApolloOrganizationProvider.js';
import { normalizeLinkedinUrl } from '../../utils/normalizeLinkedinUrl.js';

// Titles we care about for "point of contact" outreach on small/mid-size
// businesses. Apollo's title filter does partial/semantic matching, so this
// list is intentionally broad rather than exhaustive.
export const DEFAULT_TARGET_TITLES = [
    'owner', 'founder', 'co-founder', 'ceo', 'president', 'managing director',
    'general manager', 'director', 'vp', 'head of operations', 'operations manager',
];

function firstDefined(...values) {
    return values.find((v) => v !== undefined && v !== null && v !== '');
}

function isLockedEmail(email) {
    return !email || email.includes('email_not_unlocked') || email.includes('domain.com');
}

export class ApolloPeopleProvider {
    key = 'apollo';

    /**
     * Find candidate POCs at a company by domain. Does NOT reveal email/phone —
     * that costs credits and happens per-contact in enrichContact().
     */
    async discover(company, { titles = DEFAULT_TARGET_TITLES, limit = 5 } = {}) {
        const domain = company.domain || (company.website ? domainFromWebsite(company.website) : undefined);
        if (!domain) return { status: 'failed', reason: 'Company domain is required', people: [] };

        const response = await apolloRequest({
            method: 'post',
            url: '/mixed_people/search',
            data: {
                q_organization_domains_list: [domain],
                person_titles: titles,
                page: 1,
                per_page: limit,
            },
            timeout: 20000,
        });

        const people = (response.data?.people || []).map((p) => ({
            providerId: p.id,
            firstName: p.first_name,
            lastName: p.last_name,
            fullName: p.name || [p.first_name, p.last_name].filter(Boolean).join(' '),
            title: p.title,
            seniority: p.seniority,
            linkedinUrl: normalizeLinkedinUrl(p.linkedin_url),
            city: p.city,
            state: p.state,
            country: p.country,
            lockedEmail: p.email,
            raw: p,
        }));

        return { status: people.length ? 'discovered' : 'no_results', people };
    }

    /**
     * Reveal verified email for one previously-discovered person.
     * Phone reveal is NOT included here — Apollo's real-time phone reveal is
     * async and requires a registered webhook_url; wire that up separately if
     * phone numbers via Apollo become a hard requirement.
     */
    async enrichContact(person) {
        if (!person.providerId) return { enrichmentStatus: 'failed', reason: 'Missing Apollo person id' };

        const response = await apolloRequest({
            method: 'post',
            url: '/people/match',
            data: {
                id: person.providerId,
                reveal_personal_emails: true,
            },
            timeout: 20000,
        });

        const match = response.data?.person;
        if (!match) return { enrichmentStatus: 'failed', reason: 'Apollo returned no match' };

        const email = isLockedEmail(match.email) ? undefined : match.email;

        return {
            enrichmentStatus: email ? 'enriched' : 'partial',
            email,
            emailStatus: match.email_status,
            phone: firstDefined(match.sanitized_phone, match.organization?.phone),
            title: firstDefined(match.title, person.title),
            linkedinUrl: normalizeLinkedinUrl(firstDefined(match.linkedin_url, person.linkedinUrl)),
            raw: match,
        };
    }
}