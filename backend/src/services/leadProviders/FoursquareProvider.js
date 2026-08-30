import axios from 'axios';
import { LeadProvider } from './LeadProvider.interface.js';
import { env } from '../../config/env.js';

const SEARCH_URL = 'https://places-api.foursquare.com/places/search';
const API_VERSION = '2025-06-17'; // required header — legacy v3 endpoints were retired May 15, 2026

export class FoursquareProvider extends LeadProvider {
  key = 'foursquare';

  async search(params) {
    if (!env.foursquareApiKey) {
      throw new Error('FOURSQUARE_API_KEY is not configured');
    }

    const query = [params.keyword, params.category, params.businessName].filter(Boolean).join(' ');
    const near = [params.city, params.state, params.country].filter(Boolean).join(', ');

    const response = await axios.get(SEARCH_URL, {
      headers: {
        Authorization: `Bearer ${env.foursquareApiKey}`, // new API uses Bearer auth, not the raw key header the old one used
        'X-Places-Api-Version': API_VERSION,
        Accept: 'application/json',
      },
      params: {
        query: query || undefined,
        near: near || undefined,
        ...(params.lat && params.lng ? { ll: `${params.lat},${params.lng}` } : {}),
        radius: (params.radiusKm || 10) * 1000,
        limit: 50,
      },
    });

    return response.data?.results || [];
  }
}