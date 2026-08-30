import { Company } from '../models/Company.model.js';
import { Lead } from '../models/Lead.model.js';
import { providerRegistry } from '../services/leadProviders/ProviderRegistry.js';
import { normalizeLead } from '../services/leadProviders/normalizeLead.js';
import { env } from '../config/env.js';
import { ExploriumOrganizationProvider, domainFromWebsite } from '../services/leadProviders/ExploriumOrganizationProvider.js';

export async function searchCompanies(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ companies: [] });

    const regex = new RegExp(escapeRegex(q), 'i');
    const [storedCompanies, storedLeads] = await Promise.all([
      Company.find({ $or: [{ name: regex }, { domain: regex }, { website: regex }] }).sort({ updatedAt: -1 }).limit(8).lean(),
      Lead.find({ isDeleted: false, businessName: regex }).sort({ updatedAt: -1 }).limit(8).lean(),
    ]);

    let providerResults = [];

    // Explorium Business Match is used as an exact company-resolution layer
    // when configured. It complements Places/OSM discovery instead of replacing it.
    if (env.exploriumApiKey) {
      try {
        const explorium = new ExploriumOrganizationProvider();
        const domain = q.includes('.') ? domainFromWebsite(q) : '';
        const matched = await explorium.match({ name: domain ? '' : q, domain });
        if (matched?.businessId) {
          providerResults.push({
            businessName: q,
            domain,
            website: domain ? `https://${domain}` : undefined,
            source: 'explorium',
            providerId: matched.businessId,
          });
        }
      } catch (exploriumError) {
        console.warn('[company-search] Explorium match failed:', exploriumError.message);
      }
    }

    try {
      const { providerKey, results } = await providerRegistry.runDiscovery({ businessName: q, keyword: q, perPage: 10 });
      providerResults.push(...results.map((raw) => normalizeLead(providerKey, raw, {})));
    } catch (providerError) {
      // Database results are still useful if external discovery is unavailable.
      if (!storedCompanies.length && !storedLeads.length && !providerResults.length) throw providerError;
    }

    const merged = new Map();
    const add = (item, source) => {
      const name = item.name || item.businessName;
      if (!name) return;
      const domain = normalizeDomain(item.domain || item.website);
      const key = domain || `${name.toLowerCase().trim()}|${(item.city || '').toLowerCase().trim()}`;
      if (!merged.has(key)) {
        merged.set(key, {
          id: item._id || item.id,
          name,
          domain,
          website: item.website,
          industry: item.industry,
          category: item.category,
          city: item.city,
          state: item.state,
          country: item.country,
          address: item.address,
          phone: item.phone,
          employeeCount: item.employeeCount,
          employeeRange: item.employeeRange,
          companyId: item.companyId,
          source,
          providerId: item.providerId,
        });
      }
    };

    storedCompanies.forEach((c) => add(c, 'database'));
    storedLeads.forEach((l) => add(l, l.source));
    providerResults.forEach((r) => add(r, r.source));

    res.json({ companies: Array.from(merged.values()).slice(0, 15) });
  } catch (err) {
    err.publicMessage = err.publicMessage || 'Company search failed. Check your discovery provider configuration.';
    next(err);
  }
}

function normalizeDomain(value = '') {
  if (!value) return '';
  try {
    const raw = value.startsWith('http') ? value : `https://${value}`;
    return new URL(raw).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return value.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
