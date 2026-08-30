import { exploriumRequest } from './exploriumClient.js';
import { env } from '../../config/env.js';

const MATCH_URL = '/businesses/match';
const FIRMOGRAPHICS_URL = '/businesses/firmographics/enrich';
const TECHNOGRAPHICS_URL = '/businesses/technographics/enrich';
const FUNDING_URL = '/businesses/funding_and_acquisition/enrich';
const HIERARCHY_URL = '/businesses/company_hierarchies/bulk_enrich';

export function domainFromWebsite(value = '') {
  if (!value) return '';
  try {
    const raw = value.startsWith('http') ? value : `https://${value}`;
    return new URL(raw).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return value.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
  }
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function toNumber(value) {
  if (typeof value === 'number') return value;
  if (!value) return undefined;
  const match = String(value).replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function normalizeFunding(data = {}) {
  const total = firstDefined(data.known_funding_total_value, data.total_funding, data.totalFunding);
  const lastAmount = firstDefined(data.last_funding_round_value_usd, data.lastRoundAmount);
  return {
    totalFunding: toNumber(total),
    currency: total !== undefined ? 'USD' : undefined,
    lastRoundType: firstDefined(data.last_funding_round_type, data.lastRoundType),
    lastRoundAmount: toNumber(lastAmount),
    lastRoundDate: firstDefined(data.last_funding_round_date, data.lastRoundDate),
  };
}

function normalizeFirmographics(data = {}) {
  const employees = firstDefined(data.number_of_employees, data.number_of_employees_range);
  const revenue = firstDefined(data.yearly_revenue, data.yearly_revenue_range);
  const website = firstDefined(data.website, data.company_website);
  return {
    name: data.name,
    legalName: firstDefined(data.legal_name, data.company_legal_name),
    domain: domainFromWebsite(website),
    website,
    description: data.business_description,
    industry: firstDefined(data.linkedin_industry_category, data.naics_description, data.sic_code_description),
    category: firstDefined(data.google_business_category, data.google_category),
    employeeCount: typeof employees === 'number' ? employees : undefined,
    employeeRange: typeof employees === 'string' ? employees : undefined,
    revenue: typeof revenue === 'number' ? revenue : undefined,
    revenueRange: typeof revenue === 'string' ? revenue : undefined,
    revenueCurrency: revenue !== undefined ? 'USD' : undefined,
    foundedYear: toNumber(firstDefined(data.foundation_year, data.founded_year, data.year_founded)),
    phone: data.phone_number || data.company_phone_number,
    email: data.email || data.company_email,
    linkedinUrl: data.linkedin_profile || data.linkedin_url,
    headquarters: {
      address: data.street,
      city: data.city_name || data.city,
      state: data.region_name || data.region,
      country: data.country_name || data.country,
      postalCode: data.zip_code || data.postal_code,
      latitude: toNumber(data.latitude || data.company_location_latitude_degrees),
      longitude: toNumber(data.longitude || data.company_location_longitude_degrees),
    },
    locations: Array.isArray(data.locations_distribution)
      ? data.locations_distribution.map((item) => ({ country: item.country_name || item.country || item.country_code, city: item.city_name || item.city }))
      : undefined,
    providerId: data.business_id || data.entity_id,
    rawFirmographics: data,
  };
}

export class ExploriumOrganizationProvider {
  key = 'explorium';

  async match(company) {
    const name = company.name || company.businessName;
    const domain = domainFromWebsite(company.domain || company.website);
    if (!name && !domain) return null;

    const response = await exploriumRequest({
      method: 'post',
      url: MATCH_URL,
      data: {
        businesses_to_match: [{
          ...(name ? { name } : {}),
          ...(domain ? { domain } : {}),
          ...(company.linkedinUrl ? { linkedin_url: company.linkedinUrl } : {}),
        }],
        request_context: null,
      },
    });

    const matched = response.data?.matched_businesses?.[0];
    const businessId = matched?.business_id || matched?.businessId || matched?.id;
    return businessId ? { businessId, raw: matched } : null;
  }

  async enrich(company) {
    const match = company.provider === 'explorium' && company.providerId
      ? { businessId: company.providerId }
      : await this.match(company);

    if (!match?.businessId) {
      return { status: 'failed', reason: 'Explorium could not match this company.' };
    }

    const enrichmentRequests = [
      exploriumRequest({ method: 'post', url: FIRMOGRAPHICS_URL, data: { business_id: match.businessId, request_context: null, parameters: {} } }),
      exploriumRequest({ method: 'post', url: TECHNOGRAPHICS_URL, data: { business_id: match.businessId, request_context: null, parameters: {} } }),
      exploriumRequest({ method: 'post', url: FUNDING_URL, data: { business_id: match.businessId, request_context: null, parameters: {} } }),
    ];
    if (env.exploriumEnableHierarchy) {
      enrichmentRequests.push(exploriumRequest({ method: 'post', url: HIERARCHY_URL, data: { business_ids: [match.businessId], request_context: null, parameters: {} } }));
    }
    const [firmographicsResult, technographicsResult, fundingResult, hierarchyResult] = await Promise.allSettled(enrichmentRequests);

    if (firmographicsResult.status === 'rejected') {
      return { status: 'failed', providerId: match.businessId, reason: firmographicsResult.reason?.message || 'Explorium firmographics enrichment failed.' };
    }

    const firmographics = firmographicsResult.value.data?.data || {};
    const technographics = technographicsResult.status === 'fulfilled' ? technographicsResult.value.data?.data || {} : {};
    const funding = fundingResult.status === 'fulfilled' ? fundingResult.value.data?.data || {} : {};
    const hierarchyRows = hierarchyResult?.status === 'fulfilled' ? hierarchyResult.value.data?.data || [] : [];
    const hierarchy = hierarchyRows[0]?.data || hierarchyRows[0] || {};
    const normalized = normalizeFirmographics(firmographics);
    const technologies = Array.from(new Set([
      ...(technographics.full_tech_stack || []),
      ...(technographics.prog_langs_and_frameworks || []),
      ...(technographics.devops_and_development || []),
      ...(technographics.platform_and_storage || []),
    ].filter(Boolean)));

    return {
      status: 'enriched',
      providerId: match.businessId,
      data: {
        ...normalized,
        provider: 'explorium',
        technologies,
        funding: normalizeFunding(funding),
        parentCompany: hierarchy.parent_company_name ? {
          name: hierarchy.parent_company_name,
          providerId: hierarchy.parent_company_id,
        } : undefined,
        subsidiaries: Array.isArray(hierarchy.subsidiaries) ? hierarchy.subsidiaries.map((item) => ({
          name: item.name,
          providerId: item.id,
        })) : undefined,
        sourceMeta: { source: 'explorium', confidence: 'high', updatedAt: new Date() },
      },
      raw: { match: match.raw, firmographics, technographics, funding, hierarchy },
    };
  }
}
