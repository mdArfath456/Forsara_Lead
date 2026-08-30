import axios from 'axios';
import { LeadProvider } from './LeadProvider.interface.js';
import { env } from '../../config/env.js';

const BASE_URL = 'https://places.googleapis.com/v1/places:searchText';

export class GooglePlacesProvider extends LeadProvider {
  key = 'google_places';

  buildTextQuery(params) {
    // Google Places Text Search wants a single free-text query rather than
    // discrete fields — combine what the user gave us into one string.
    const parts = [
      params.keyword,
      params.category,
      params.businessName,
      params.city,
      params.state,
      params.country,
    ].filter(Boolean);
    return parts.join(' ');
  }

  async search(params) {
    if (!env.googlePlacesApiKey) {
      throw new Error('GOOGLE_PLACES_API_KEY is not configured');
    }

    const textQuery = this.buildTextQuery(params);

    const response = await axios.post(
      BASE_URL,
      {
        textQuery,
        ...(params.lat && params.lng
          ? {
              locationBias: {
                circle: {
                  center: { latitude: params.lat, longitude: params.lng },
                  radius: (params.radiusKm || 10) * 1000,
                },
              },
            }
          : {}),
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': env.googlePlacesApiKey,
          // Field mask keeps the response (and billing tier) minimal —
          // add fields deliberately, don't use '*' in production.
          'X-Goog-FieldMask': [
            'places.displayName',
            'places.formattedAddress',
            'places.addressComponents',
            'places.location',
            'places.internationalPhoneNumber',
            'places.websiteUri',
            'places.rating',
            'places.userRatingCount',
            'places.primaryType',
          ].join(','),
        },
      }
    );

    return response.data.places || [];
  }

  // Google Places does not provide enrichment (emails); enrich() intentionally
  // not implemented here — ApolloEnrichmentProvider owns that responsibility.
}
