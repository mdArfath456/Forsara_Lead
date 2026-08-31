import { exploriumRequest } from './exploriumClient.js';
import { domainFromWebsite } from './ApolloOrganizationProvider.js';
import { pickBestLinkedinUrl } from '../../utils/normalizeLinkedinUrl.js';

// Explorium's job_level taxonomy — see /v1/prospects filters.
export const DEFAULT_TARGET_JOB_LEVELS = ['owner', 'founder', 'c-suite', 'president', 'director', 'vice president', 'manager'];

export class ExploriumPeopleProvider {
    key = 'explorium';

    /** Step 1: resolve Explorium's internal business_id for this company. */
    async matchBusiness(company) {
        const domain = company.domain || (company.website ? domainFromWebsite(company.website) : undefined);
        if (!domain && !company.name) return null;

        const response = await exploriumRequest({
            method: 'post',
            url: '/businesses/match',
            data: {
                businesses_to_match: [{ name: company.name, domain }],
            },
            timeout: 20000,
        });

        const matched = response.data?.matched_businesses?.[0];
        return matched?.business_id || null;
    }

    /** Step 2: find candidate POCs at that business. No contact details yet. */
    async discover(company, { jobLevels = DEFAULT_TARGET_JOB_LEVELS, limit = 5 } = {}) {
        const businessId = await this.matchBusiness(company);
        if (!businessId) return { status: 'failed', reason: 'Explorium could not match this business', people: [] };

        const response = await exploriumRequest({
            method: 'post',
            url: '/prospects',
            data: {
                mode: 'full',
                page_size: limit,
                page: 1,
                filters: {
                    business_id: { values: [businessId] },
                    job_level: { values: jobLevels },
                },
            },
            timeout: 20000,
        });

        const people = (response.data?.data || []).map((p) => ({
            providerId: p.prospect_id,
            firstName: p.first_name,
            lastName: p.last_name,
            fullName: p.full_name,
            title: p.job_title,
            seniority: p.job_level_main,
            department: p.job_department_main,
            linkedinUrl: pickBestLinkedinUrl(p.linkedin, p.linkedin_url_array),
            city: p.city,
            state: p.region_name,
            country: p.country_name,
            raw: p,
        }));

        return { status: people.length ? 'discovered' : 'no_results', businessId, people };
    }

    /** Step 3: reveal verified email + phone for one previously-discovered prospect. */
    async enrichContact(person) {
        if (!person.providerId) return { enrichmentStatus: 'failed', reason: 'Missing Explorium prospect id' };

        const response = await exploriumRequest({
            method: 'post',
            url: '/prospects/contacts_information/enrich',
            data: {
                prospect_id: person.providerId,
                parameters: { contact_types: ['email', 'phone'] },
            },
            timeout: 20000,
        });

        const data = Array.isArray(response.data?.data) ? response.data.data[0] : response.data?.data;
        if (!data) return { enrichmentStatus: 'failed', reason: 'Explorium returned no contact data' };

        const email = data.professions_email || data.emails?.[0]?.email || data.emails?.[0]?.value;
        const phone = data.mobile_phone || data.phone_numbers?.[0]?.phone_number || data.phone_numbers?.[0]?.value;

        return {
            enrichmentStatus: email || phone ? 'enriched' : 'partial',
            email,
            emailStatus: data.professional_email_status,
            phone,
            raw: data,
        };
    }
}