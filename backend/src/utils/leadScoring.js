/**
 * Rule-based lead score. Enrichment adds high-value signals while keeping the
 * base score useful for leads that have not been enriched yet.
 */
export function computeLeadScore(lead) {
  let score = 0;
  if (lead.phone) score += 20;
  if (lead.website) score += 15;
  if (lead.email) score += 20;
  if (typeof lead.googleRating === 'number' && lead.googleRating > 4) score += 15;
  if (typeof lead.reviewCount === 'number' && lead.reviewCount > 20) score += 10;
  if (lead.companyId) score += 5;
  if (lead.contactsCount > 0) score += 10;
  if (lead.relevantProjectsCount > 0) score += 5;

  return Math.min(score, 100);
}

export function scoreTier(score) {
  if (score >= 80) return 'very-high';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export function withScore(leadObj) {
  const score = typeof leadObj.leadScore === 'number' ? leadObj.leadScore : computeLeadScore(leadObj);
  return { ...leadObj, score, scoreTier: scoreTier(score) };
}
