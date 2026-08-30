import { Lead } from '../models/Lead.model.js';

/**
 * Given normalized lead objects for one project, mark any that already exist
 * (same dedupeKey within the project) instead of inserting a straight
 * duplicate. Returns { toInsert, flaggedCount }.
 */
export async function partitionNewAndDuplicateLeads(normalizedLeads, projectId) {
  const keys = normalizedLeads.map((l) => l.dedupeKey);
  const existing = await Lead.find({ projectId, dedupeKey: { $in: keys } })
    .notDeleted()
    .select('dedupeKey')
    .lean();
  const existingKeys = new Set(existing.map((e) => e.dedupeKey));

  const toInsert = [];
  let flaggedCount = 0;

  for (const lead of normalizedLeads) {
    if (existingKeys.has(lead.dedupeKey)) {
      flaggedCount += 1;
      continue; // skip — do not insert a duplicate row
    }
    toInsert.push(lead);
    existingKeys.add(lead.dedupeKey); // guard against dupes within the same batch too
  }

  return { toInsert, flaggedCount };
}
