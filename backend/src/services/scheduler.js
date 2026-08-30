import cron from 'node-cron';
import { SavedSearch, Notification } from '../models/SavedSearch.model.js';
import { Project } from '../models/Project.model.js';
import { Lead } from '../models/Lead.model.js';
import { providerRegistry } from './leadProviders/ProviderRegistry.js';
import { normalizeLead } from './leadProviders/normalizeLead.js';
import { partitionNewAndDuplicateLeads } from '../utils/dedupe.js';
import { processQueuedEnrichmentJobs } from './enrichment/LeadEnrichmentService.js';

const FREQUENCY_MS = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

async function isDue(savedSearch) {
  if (!savedSearch.lastRunAt) return true;
  const elapsed = Date.now() - savedSearch.lastRunAt.getTime();
  return elapsed >= FREQUENCY_MS[savedSearch.frequency];
}

async function runOneSavedSearch(savedSearch) {
  try {
    const { providerKey, results } = await providerRegistry.runDiscovery(savedSearch.queryParams);
    const normalized = results.map((r) =>
      normalizeLead(providerKey, r, { projectId: savedSearch.projectId, industry: savedSearch.queryParams.industry })
    );
    const { toInsert } = await partitionNewAndDuplicateLeads(normalized, savedSearch.projectId);
    const inserted = toInsert.length ? await Lead.insertMany(toInsert) : [];

    if (inserted.length > 0) {
      await Project.findByIdAndUpdate(savedSearch.projectId, { $inc: { leadCount: inserted.length } });
      await Notification.create({
        savedSearchId: savedSearch._id,
        message: `"${savedSearch.name}" found ${inserted.length} new lead${inserted.length === 1 ? '' : 's'}`,
        newLeadCount: inserted.length,
      });
    }

    savedSearch.lastRunAt = new Date();
    await savedSearch.save();
  } catch (err) {
    // One saved search failing (bad params, provider outage) shouldn't stop
    // the others from running — log and move on rather than throwing.
    console.error(`[scheduler] saved search "${savedSearch.name}" failed:`, err.message);
  }
}

async function runDueSavedSearches() {
  const active = await SavedSearch.find({ isActive: true });
  const due = [];
  for (const s of active) {
    if (await isDue(s)) due.push(s);
  }
  if (due.length === 0) return;

  console.log(`[scheduler] running ${due.length} due saved search(es)`);
  for (const savedSearch of due) {
    await runOneSavedSearch(savedSearch);
  }
}

/**
 * Checks once a day for saved searches that are due (daily/weekly), rather
 * than scheduling a separate cron entry per saved search — simpler to
 * reason about and handles searches created at arbitrary times correctly.
 */
async function runEnrichmentQueue() {
  try {
    await processQueuedEnrichmentJobs(3);
  } catch (err) {
    console.error('[scheduler] enrichment queue failed:', err.message);
  }
}

export function startScheduler() {
  cron.schedule('* * * * *', () => {
    runEnrichmentQueue();
  });

  cron.schedule('0 6 * * *', () => {
    runDueSavedSearches().catch((err) => console.error('[scheduler] run failed:', err));
  });
  console.log('[scheduler] saved-search scheduler started (daily check at 06:00)');
}
