import axios from 'axios';
import { LeadProvider } from './LeadProvider.interface.js';
import { geocodeLocation } from './geocode.js';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Maps common category/keyword words to OSM tag keys so a plain-language
// search ("restaurants", "plumbers") resolves to real OSM tags. Extend this
// as you see what categories the consultancy actually searches for.
const CATEGORY_TAG_MAP = {
  restaurant: 'amenity=restaurant',
  cafe: 'amenity=cafe',
  hotel: 'tourism=hotel',
  hospital: 'amenity=hospital',
  clinic: 'amenity=clinic',
  pharmacy: 'amenity=pharmacy',
  school: 'amenity=school',
  bank: 'amenity=bank',
  gym: 'leisure=fitness_centre',
  salon: 'shop=hairdresser',
  plumber: 'craft=plumber',
  electrician: 'craft=electrician',
  lawyer: 'office=lawyer',
  accountant: 'office=accountant',
  it: 'office=it',
  consultancy: 'office=consulting',
  realestate: 'office=estate_agent',
};

export class OverpassProvider extends LeadProvider {
  key = 'overpass';

  resolveTag(params) {
    const needle = (params.category || params.keyword || params.industry || '').toLowerCase().trim();
    for (const [word, tag] of Object.entries(CATEGORY_TAG_MAP)) {
      if (needle.includes(word)) return tag;
    }
    // Fallback: generic "named place" search matched against the free-text
    // name filter below rather than a category tag.
    return null;
  }

  async search(params) {
    let lat = params.lat;
    let lng = params.lng;

    if (!lat || !lng) {
      const geocoded = await geocodeLocation(params);
      if (!geocoded) {
        throw new Error('Could not resolve a location for OSM search — provide city/state/country or lat/lng');
      }
      lat = geocoded.lat;
      lng = geocoded.lng;
    }

    const radiusMeters = (params.radiusKm || 10) * 1000;
    const tag = this.resolveTag(params);
    const nameFilter = params.businessName
      ? `["name"~"${escapeOverpassRegex(params.businessName)}",i]`
      : '';

    // Overpass QL: search nodes/ways with the resolved tag (or any named
    // place if no tag matched) within radius of the geocoded point.
    const tagFilter = tag ? `["${tag.split('=')[0]}"="${tag.split('=')[1]}"]` : '["name"]';
    const query = `
      [out:json][timeout:25];
      (
        node${tagFilter}${nameFilter}(around:${radiusMeters},${lat},${lng});
        way${tagFilter}${nameFilter}(around:${radiusMeters},${lat},${lng});
      );
      out center 50;
    `;

    const response = await axios.post(OVERPASS_URL, query, {
      headers: { 'Content-Type': 'text/plain' },
      timeout: 30000,
    });

    return response.data?.elements || [];
  }

  // No enrichment capability — OSM data is community-sourced and doesn't
  // include verified emails/direct dials.
}

function escapeOverpassRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
