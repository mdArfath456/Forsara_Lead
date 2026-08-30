export function normalizeLead(source, raw, context = {}) {
  switch (source) {
    case 'google_places':
      return normalizeGooglePlace(raw, context);
    case 'overpass':
      return normalizeOverpassElement(raw, context);
    case 'foursquare':
      return normalizeFoursquarePlace(raw, context);
    default:
      throw new Error(`normalizeLead: no normalizer registered for source "${source}"`);
  }
}

function normalizeGooglePlace(raw, context) {
  const comps = raw.addressComponents || [];
  const findComp = (type) => comps.find((c) => c.types?.includes(type))?.longText;

  return {
    businessName: raw.displayName?.text || 'Unknown',
    industry: context.industry,
    category: raw.primaryType,
    phone: raw.internationalPhoneNumber,
    website: raw.websiteUri,
    address: raw.formattedAddress,
    city: findComp('locality') || findComp('postal_town'),
    state: findComp('administrative_area_level_1'),
    country: findComp('country'),
    postalCode: findComp('postal_code'),
    location: raw.location
      ? { type: 'Point', coordinates: [raw.location.longitude, raw.location.latitude] }
      : undefined,
    googleRating: raw.rating,
    reviewCount: raw.userRatingCount,
    source: 'google_places',
    enrichmentStatus: 'none',
    projectId: context.projectId,
    dedupeKey: buildDedupeKey(raw.displayName?.text, findComp('locality'), findComp('postal_code')),
  };
}

/**
 * OSM elements are tag bags — shape varies a lot by contributor, so most
 * fields here are "if present" with graceful fallback to undefined rather
 * than throwing on missing data.
 */
function normalizeOverpassElement(raw, context) {
  const tags = raw.tags || {};
  // 'way' elements return a 'center' point instead of direct lat/lon
  const lat = raw.lat ?? raw.center?.lat;
  const lon = raw.lon ?? raw.center?.lon;

  return {
    businessName: tags.name || 'Unknown',
    industry: context.industry,
    category: tags.amenity || tags.shop || tags.office || tags.craft || tags.tourism,
    phone: tags.phone || tags['contact:phone'],
    email: tags.email || tags['contact:email'],
    website: tags.website || tags['contact:website'],
    address: [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ') || undefined,
    city: tags['addr:city'],
    state: tags['addr:state'],
    country: tags['addr:country'],
    postalCode: tags['addr:postcode'],
    location: lat && lon ? { type: 'Point', coordinates: [lon, lat] } : undefined,
    source: 'overpass',
    enrichmentStatus: 'none',
    projectId: context.projectId,
    dedupeKey: buildDedupeKey(tags.name, tags['addr:city'], tags['addr:postcode']),
  };
}

function normalizeFoursquarePlace(raw, context) {
  const loc = raw.location || {};
  return {
    businessName: raw.name || 'Unknown',
    industry: context.industry,
    category: raw.categories?.[0]?.name,
    phone: raw.tel,
    email: raw.email, // the new API returns this directly — the old v3 endpoint never did
    website: raw.website,
    address: loc.address,
    city: loc.locality,
    state: loc.region,
    country: loc.country,
    postalCode: loc.postcode,
    location: raw.latitude && raw.longitude ? { type: 'Point', coordinates: [raw.longitude, raw.latitude] } : undefined,
    source: 'foursquare',
    enrichmentStatus: raw.email ? 'enriched' : 'none', // email may already be present straight from discovery now
    projectId: context.projectId,
    dedupeKey: buildDedupeKey(raw.name, loc.locality, loc.postcode),
  };
}

/**
 * Simple, deterministic dedupe key: lowercased business name + city + postal
 * code, whitespace-collapsed. Good enough to catch exact re-searches;
 * fuzzy near-duplicate detection (typos, "Inc" vs "Incorporated") is a
 * follow-up enhancement, not required for v1.
 */
export function buildDedupeKey(name = '', city = '', postalCode = '') {
  const norm = (s) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
  return `${norm(name)}|${norm(city)}|${norm(postalCode)}`;
}
