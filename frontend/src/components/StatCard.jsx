import { motion } from 'framer-motion';

export function StatCard({ label, value, icon: Icon, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      className="min-w-0 rounded-2xl glass-panel glass-panel-hover p-4 sm:p-5"
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <span className="min-w-0 text-sm leading-5 text-gray-400">{label}</span>
        {Icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-gradient/20">
            <Icon size={16} className="text-brand-400" />
          </div>
        )}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
    </motion.div>
  );
}
