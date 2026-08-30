// backend/src/services/leadProviders/ExploriumProvider.js

import {
    exploriumRequest,
} from './exploriumClient.js';

function cleanDomain(value = '') {
    if (!value) return '';

    try {
        const url = value.startsWith('http')
            ? value
            : `https://${value}`;

        return new URL(url)
            .hostname
            .replace(/^www\./, '')
            .toLowerCase();
    } catch {
        return value
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .split('/')[0]
            .toLowerCase();
    }
}

function first(...values) {
    return values.find(
        (value) =>
            value !== undefined &&
            value !== null &&
            value !== ''
    );
}

/*
 * ============================================================
 * COMPANY MATCH
 * ============================================================
 */

export async function matchCompany({
    name,
    domain,
    website,
}) {
    const response =
        await exploriumRequest({
            method: 'POST',
            url: '/businesses/match',

            data: {
                businesses_to_match: [
                    {
                        name,
                        domain: cleanDomain(
                            domain || website
                        ),
                    },
                ],
            },
        });

    console.log(
        '[Explorium] company match:',
        JSON.stringify(
            response,
            null,
            2
        )
    );

    const companies =
        response?.matched_businesses ||
        response?.data ||
        [];

    const company =
        companies.find(
            (item) =>
                item?.business_id ||
                item?.id
        );

    if (!company) {
        return null;
    }

    return {
        businessId:
            company.business_id ||
            company.id,

        raw:
            company,
    };
}

/*
 * ============================================================
 * COMPANY ENRICHMENT
 * ============================================================
 */

export async function enrichCompany({
    name,
    domain,
    website,
}) {
    const matched =
        await matchCompany({
            name,
            domain,
            website,
        });

    if (!matched) {
        return {
            success: false,
            people: [],
            message:
                'Company not found in Explorium',
        };
    }

    const response =
        await exploriumRequest({
            method: 'POST',

            url:
                '/businesses/firmographics/enrich',

            data: {
                business_id:
                    matched.businessId,
            },
        });

    const company =
        response?.data ||
        response ||
        {};

    return {
        success: true,

        businessId:
            matched.businessId,

        company,

        raw: response,
    };
}

/*
 * ============================================================
 * PEOPLE SEARCH
 *
 * IMPORTANT:
 * Do NOT use restrictive job filters initially.
 * First get people belonging to the company.
 * ============================================================
 */

export async function searchPeople({
    businessId,
    size = 25,
}) {
    const response =
        await exploriumRequest({
            method: 'POST',

            url: '/prospects',

            data: {
                mode: 'full',

                size:
                    Math.min(size, 100),

                page_size:
                    Math.min(size, 100),

                page: 1,

                request_context: null,

                filters: {
                    business_id: {
                        values: [
                            businessId,
                        ],
                    },
                },
            },
        });

    console.log(
        '[Explorium] people response:',
        JSON.stringify(
            response,
            null,
            2
        )
    );

    const people =
        response?.data ||
        response?.prospects ||
        response?.results ||
        [];

    return people;
}

/*
 * ============================================================
 * PERSON PROFILE
 * ============================================================
 */

export async function enrichPersonProfile(
    prospectId
) {
    const response =
        await exploriumRequest({
            method: 'POST',

            url:
                '/prospects/profiles/enrich',

            data: {
                prospect_id:
                    prospectId,

                request_context:
                    null,
            },
        });

    return (
        response?.data ||
        response ||
        {}
    );
}

/*
 * ============================================================
 * PERSON CONTACT INFORMATION
 *
 * This is the important part for:
 *
 * EMAIL
 * PHONE
 * MOBILE PHONE
 * ============================================================
 */

export async function enrichPersonContact(
    prospectId
) {
    const response =
        await exploriumRequest({
            method: 'POST',

            url:
                '/prospects/contacts_information/enrich',

            data: {
                prospect_id:
                    prospectId,

                request_context:
                    null,

                parameters: {
                    contact_types: [
                        'email',
                        'phone',
                        'mobile_phone',
                    ],
                },
            },
        });

    console.log(
        `[Explorium] contact ${prospectId}:`,
        JSON.stringify(
            response,
            null,
            2
        )
    );

    return (
        response?.data ||
        response ||
        {}
    );
}

/*
 * ============================================================
 * EXTRACT EMAIL
 * ============================================================
 */

function extractEmail(data) {
    return first(
        data?.professional_email,

        data?.professions_email,

        data?.email,

        data?.work_email,

        data?.business_email,

        Array.isArray(data?.emails)
            ? data.emails.find(
                (item) =>
                    typeof item ===
                    'string'
            )
            : null,

        Array.isArray(data?.emails)
            ? data.emails.find(
                (item) =>
                    item?.email
            )?.email
            : null,

        Array.isArray(
            data?.email_addresses
        )
            ? data.email_addresses.find(
                (item) =>
                    typeof item ===
                    'string'
            )
            : null
    );
}

/*
 * ============================================================
 * EXTRACT PHONE
 * ============================================================
 */

function extractPhone(data) {
    return first(
        data?.mobile_phone,

        data?.phone,

        data?.phone_number,

        data?.business_phone,

        data?.work_phone,

        Array.isArray(
            data?.phone_numbers
        )
            ? data.phone_numbers.find(
                (item) =>
                    typeof item ===
                    'string'
            )
            : null,

        Array.isArray(
            data?.phone_numbers
        )
            ? data.phone_numbers.find(
                (item) =>
                    item?.phone_number
            )?.phone_number
            : null,

        Array.isArray(
            data?.phone_numbers
        )
            ? data.phone_numbers.find(
                (item) =>
                    item?.sanitized_number
            )?.sanitized_number
            : null
    );
}

/*
 * ============================================================
 * MAP PERSON
 * ============================================================
 */

function mapPerson(
    person,
    profile,
    contact
) {
    return {
        firstName: first(
            profile?.first_name,
            person?.first_name
        ),

        lastName: first(
            profile?.last_name,
            person?.last_name
        ),

        fullName: first(
            profile?.full_name,
            person?.full_name,

            [
                profile?.first_name ||
                person?.first_name,

                profile?.last_name ||
                person?.last_name,
            ]
                .filter(Boolean)
                .join(' ')
        ),

        title: first(
            profile?.job_title,
            person?.job_title
        ),

        department: first(
            profile?.job_department_main,
            profile?.job_department,
            person?.job_department_main,
            person?.job_department
        ),

        seniority: first(
            profile?.job_level_main,
            profile?.job_seniority_level,
            person?.job_level_main,
            person?.job_seniority_level
        ),

        email:
            extractEmail(contact),

        emailStatus: first(
            contact?.professional_email_status,
            contact?.email_status
        ),

        phone:
            extractPhone(contact),

        mobilePhone:
            contact?.mobile_phone,

        linkedinUrl: first(
            profile?.linkedin,
            profile?.linkedin_url,
            profile?.linkedin_profile,

            person?.linkedin,
            person?.linkedin_url,
            person?.linkedin_profile
        ),

        location: {
            city: first(
                profile?.city,
                person?.city
            ),

            state: first(
                profile?.region_name,
                person?.region_name
            ),

            country: first(
                profile?.country_name,
                person?.country_name
            ),
        },

        provider:
            'explorium',

        providerId:
            person?.prospect_id,

        employmentHistory:
            profile?.experience ||
            [],

        raw: {
            prospect:
                person,

            profile,

            contact,
        },
    };
}

/*
 * ============================================================
 * COMPLETE COMPANY PEOPLE ENRICHMENT
 * ============================================================
 */

export async function getCompanyPeople({
    businessId,
    size = 25,
}) {
    const people =
        await searchPeople({
            businessId,
            size,
        });

    console.log(
        `[Explorium] Found ${people.length} people`
    );

    const results = [];

    for (
        const person of people
    ) {
        const prospectId =
            person?.prospect_id;

        /*
         * Without prospect_id we cannot perform
         * contact enrichment.
         */
        if (!prospectId) {
            results.push(
                mapPerson(
                    person,
                    {},
                    {}
                )
            );

            continue;
        }

        let profile = {};
        let contact = {};

        /*
         * Get profile.
         */
        try {
            profile =
                await enrichPersonProfile(
                    prospectId
                );
        } catch (error) {
            console.error(
                `[Explorium] profile failed ${prospectId}:`,
                error.response?.data ||
                error.message
            );
        }

        /*
         * Get EMAIL + PHONE.
         */
        try {
            contact =
                await enrichPersonContact(
                    prospectId
                );
        } catch (error) {
            console.error(
                `[Explorium] contact failed ${prospectId}:`,
                error.response?.data ||
                error.message
            );
        }

        results.push(
            mapPerson(
                person,
                profile,
                contact
            )
        );
    }

    return results;
}

/*
 * ============================================================
 * COMPLETE FLOW
 * ============================================================
 */

export async function enrichCompanyAndPeople({
    name,
    domain,
    website,
}) {
    const company =
        await enrichCompany({
            name,
            domain,
            website,
        });

    if (!company.success) {
        return {
            success: false,

            company: null,

            people: [],
        };
    }

    const people =
        await getCompanyPeople({
            businessId:
                company.businessId,

            size: 25,
        });

    return {
        success: true,

        businessId:
            company.businessId,

        company:
            company.company,

        people,

        raw: {
            company:
                company.raw,

            people,
        },
    };
}