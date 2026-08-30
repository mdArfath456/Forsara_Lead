import { apolloRequest } from './apolloClient.js';

const URL = '/organizations/enrich';

function domainFromWebsite(value = '') {
  try {
    const raw = value.startsWith('http') ? value : `https://${value}`;
    return new URL(raw).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return value.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
  }
}

function firstDefined(...values) {
  return values.find((v) => v !== undefined && v !== null && v !== '');
}

export class ApolloOrganizationProvider {
  key = 'apollo';

  async enrich(company) {
    const domain = domainFromWebsite(company.domain || company.website);
    if (!domain) return { status: 'failed', reason: 'Company domain is required' };

    const response = await apolloRequest({
      method: 'get',
      url: URL,
      params: { domain, name: company.name || undefined, website: company.website || undefined },
      timeout: 20000,
    });

    const org = response.data?.organization;
    if (!org) return { status: 'failed', reason: 'Apollo returned no organization' };

    const locations = (org.locations || []).map((loc) => ({
      address: firstDefined(loc.raw_address, loc.address),
      city: firstDefined(loc.city, loc.locality),
      state: firstDefined(loc.state, loc.region),
      country: loc.country,
      postalCode: firstDefined(loc.postal_code, loc.zip),
      latitude: loc.latitude,
      longitude: loc.longitude,
    }));

    const hq = org.primary_location || locations[0];
    const subsidiaries = (org.suborganizations || []).map((s) => ({
      name: s.name,
      domain: s.primary_domain,
      providerId: s.id,
    }));

    return {
      status: 'enriched',
      providerId: org.id,
      raw: org,
      data: {
        name: firstDefined(org.name, company.name),
        legalName: org.legal_name,
        domain: firstDefined(org.primary_domain, domain),
        website: firstDefined(org.website_url, company.website),
        description: org.short_description || org.description,
        industry: org.industry,
        employeeCount: firstDefined(org.estimated_num_employees, org.num_employees),
        employeeRange: org.employee_range,
        revenue: firstDefined(org.annual_revenue, org.revenue),
        revenueCurrency: org.revenue_currency,
        foundedYear: org.founded_year,
        phone: firstDefined(org.phone, org.primary_phone?.number),
        email: firstDefined(org.primary_email),
        linkedinUrl: firstDefined(org.linkedin_url),
        headquarters: hq,
        locations,
        technologies: (org.technology_names || org.technologies || []).map((t) => (typeof t === 'string' ? t : t.name)).filter(Boolean),
        funding: {
          totalFunding: firstDefined(org.total_funding, org.total_funding_amount),
          currency: org.funding_currency,
          lastRoundType: firstDefined(org.latest_funding_stage, org.last_funding_type),
          lastRoundAmount: firstDefined(org.latest_funding_amount, org.last_funding_amount),
          lastRoundDate: firstDefined(org.latest_funding_date, org.last_funding_date),
        },
        parentCompany: org.owned_by_organization
          ? { name: org.owned_by_organization.name, domain: org.owned_by_organization.primary_domain, providerId: org.owned_by_organization.id }
          : undefined,
        subsidiaries,
      },
    };
  }
}

export { domainFromWebsite };
