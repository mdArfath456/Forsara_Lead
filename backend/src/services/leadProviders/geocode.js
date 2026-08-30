import axios from 'axios';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

/**
 * Free, no API key — but Nominatim's usage policy requires a real
 * identifying User-Agent and caps at ~1 request/sec. We geocode once per
 * search (not per result), so this stays well within that limit.
 * https://operations.osmfoundation.org/policies/nominatim/
 */
export async function geocodeLocation({ city, state, country, postalCode }) {
  const query = [city, state, postalCode, country].filter(Boolean).join(', ');
  if (!query) return null;

  const response = await axios.get(NOMINATIM_URL, {
    params: { q: query, format: 'json', limit: 1 },
    headers: {
      'User-Agent': 'forsara-lead-extractor/1.0 (internal tool)',
    },
  });

  const result = response.data?.[0];
  if (!result) return null;

  return { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
}
