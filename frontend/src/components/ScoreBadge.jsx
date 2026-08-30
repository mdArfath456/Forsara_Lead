const TIER_STYLES = {
  high: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  low: 'bg-white/[0.06] text-gray-500 border-white/[0.08]',
};

export function ScoreBadge({ score, scoreTier }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${TIER_STYLES[scoreTier] || TIER_STYLES.low}`}>
      {score}
    </span>
  );
}
