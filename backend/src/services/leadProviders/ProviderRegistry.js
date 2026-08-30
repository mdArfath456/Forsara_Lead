import { GooglePlacesProvider } from './GooglePlacesProvider.js';
import { FoursquareProvider } from './FoursquareProvider.js';
import { OverpassProvider } from './OverpassProvider.js';
import { ExploriumOrganizationProvider } from './ExploriumOrganizationProvider.js';
import { ApolloOrganizationProvider } from './ApolloOrganizationProvider.js';

class ProviderRegistry {
  constructor() {
    this.discoveryProviders = [new GooglePlacesProvider(), new FoursquareProvider(), new OverpassProvider()];
    this.enrichmentProviders = [new ExploriumOrganizationProvider(), new ApolloOrganizationProvider()];
  }

  getDiscoveryProvider(key) {
    return this.discoveryProviders.find((p) => p.key === key) || this.discoveryProviders[0];
  }

  getEnrichmentProvider(key) {
    return this.enrichmentProviders.find((p) => p.key === key) || this.enrichmentProviders[0];
  }

  async runDiscovery(params) {
    let lastError;
    for (const provider of this.discoveryProviders) {
      try {
        const results = await provider.search(params);
        return { providerKey: provider.key, results };
      } catch (err) {
        lastError = err;
        console.error(`[providers] ${provider.key} search failed, trying next:`, err.message);
      }
    }
    throw lastError || new Error('No discovery providers available');
  }

  async runEnrichment(company, preferredKey = 'explorium') {
    const provider = this.getEnrichmentProvider(preferredKey);
    return provider.enrich(company);
  }
}

export const providerRegistry = new ProviderRegistry();
