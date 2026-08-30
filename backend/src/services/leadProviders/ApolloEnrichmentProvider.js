import { LeadProvider } from './LeadProvider.interface.js';
import { apolloRequest } from './apolloClient.js';

const ENRICH_URL = '/organizations/enrich';

export class ApolloEnrichmentProvider extends LeadProvider {
  key = 'apollo';

  async enrich(lead) {
    if (!lead.website) return { enrichmentStatus: 'failed', reason: 'Company website/domain is required' };

    const domain = lead.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
    if (!domain) return { enrichmentStatus: 'failed', reason: 'Company domain is required' };

    const response = await apolloRequest({
      method: 'get',
      url: ENRICH_URL,
      params: { domain },
      timeout: 20000,
    });

    const org = response.data?.organization;
    if (!org) return { enrichmentStatus: 'failed', reason: 'Apollo returned no organization' };

    return {
      email: org.primary_email || undefined,
      phone: org.phone || lead.phone,
      enrichmentStatus: 'enriched',
    };
  }
}
