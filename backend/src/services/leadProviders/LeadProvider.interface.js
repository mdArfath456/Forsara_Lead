/**
 * Every discovery/enrichment provider must implement this shape.
 * Nothing outside this folder should ever import a provider directly —
 * always go through ProviderRegistry so swapping/adding providers never
 * touches controllers, routes, or the frontend contract.
 */

/**
 * @typedef {Object} SearchParams
 * @property {string} [businessName]
 * @property {string} [industry]
 * @property {string} [category]
 * @property {string} [keyword]
 * @property {string} [country]
 * @property {string} [state]
 * @property {string} [city]
 * @property {string} [postalCode]
 * @property {number} [radiusKm]
 * @property {number} [lat]
 * @property {number} [lng]
 */

/**
 * @typedef {Object} RawLead - provider-specific shape, normalized downstream
 */

export class LeadProvider {
  /** @type {string} unique key, e.g. 'google_places' */
  key = 'unknown';

  /**
   * @param {SearchParams} params
   * @returns {Promise<RawLead[]>}
   */
  async search(_params) {
    throw new Error(`${this.constructor.name} does not implement search()`);
  }

  /**
   * @param {import('../../models/Lead.model.js').Lead} lead
   * @returns {Promise<Partial<RawLead>>} fields to merge into the lead
   */
  async enrich(_lead) {
    throw new Error(`${this.constructor.name} does not implement enrich()`);
  }
}
