import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-500 text-sm">
      <Loader2 size={20} className="animate-spin text-brand-400" />
      {label}
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center gap-2 rounded-2xl glass-panel"
    >
      <p className="font-medium text-gray-300">{title}</p>
      {description && <p className="text-sm text-gray-500 max-w-sm">{description}</p>}
      {action}
    </motion.div>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-3 rounded-2xl glass-panel">
      <p className="text-sm text-red-400">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="glass-button-ghost">
          Retry
        </button>
      )}
    </div>
  );
}
