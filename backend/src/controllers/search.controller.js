import { providerRegistry } from '../services/leadProviders/ProviderRegistry.js';
import { normalizeLead } from '../services/leadProviders/normalizeLead.js';
import { partitionNewAndDuplicateLeads } from '../utils/dedupe.js';
import { Lead } from '../models/Lead.model.js';
import { Project } from '../models/Project.model.js';
import { SearchHistory } from '../models/index.js';
import { cacheGet, cacheSet, buildSearchCacheKey } from '../config/redis.js';

export async function runSearch(req, res, next) {
  try {
    const params = req.body; // validated upstream by search.validator.js
    const cacheKey = buildSearchCacheKey(params);

    const cached = await cacheGet(cacheKey);
    if (cached) {
      await SearchHistory.create({
        projectId: cached.projectId,
        queryParams: params,
        providerUsed: cached.providerUsed,
        resultCount: cached.leadIds.length,
        cacheHit: true,
      });
      const leads = await Lead.find({ _id: { $in: cached.leadIds } }).notDeleted();
      return res.json({ leads, project: cached.projectId, cacheHit: true });
    }

    // 1. Discovery
    const { providerKey, results } = await providerRegistry.runDiscovery(params);

    // 2. Project — create one per search, per spec ("each search should create a project")
    const project = await Project.create({
      name: params.projectName || buildDefaultProjectName(params),
      searchCriteria: params,
    });

    // 3. Normalize + dedupe + persist
    const normalized = results.map((r) =>
      normalizeLead(providerKey, r, { projectId: project._id, industry: params.industry })
    );
    const { toInsert, flaggedCount } = await partitionNewAndDuplicateLeads(normalized, project._id);
    const inserted = toInsert.length ? await Lead.insertMany(toInsert) : [];

    project.leadCount = inserted.length;
    await project.save();

    await SearchHistory.create({
      projectId: project._id,
      queryParams: params,
      providerUsed: providerKey,
      resultCount: inserted.length,
      cacheHit: false,
    });

    await cacheSet(cacheKey, {
      projectId: project._id,
      providerUsed: providerKey,
      leadIds: inserted.map((l) => l._id),
    });

    res.json({
      leads: inserted,
      project,
      duplicatesSkipped: flaggedCount,
      cacheHit: false,
    });
  } catch (err) {
    err.publicMessage = 'Search failed — please try again or adjust your search criteria';
    next(err);
  }
}

function buildDefaultProjectName(params) {
  const bits = [params.keyword, params.category, params.city, params.country].filter(Boolean);
  return bits.length ? bits.join(' – ') : `Search ${new Date().toISOString()}`;
}
