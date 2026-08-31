import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { apiClient } from '../lib/apiClient';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.get('/notifications').then((r) => r.data),
    refetchInterval: 60_000, // poll every minute — cheap, avoids needing websockets for this
  });

  const markAllRead = useMutation({
    mutationFn: () => apiClient.patch('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = data?.unreadCount || 0;

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open && unreadCount > 0) markAllRead.mutate();
        }}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/[0.06] transition-colors"
      >
        <Bell size={16} className="text-[var(--icon-muted)]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand-500 text-[10px] flex items-center justify-center text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full right-0 z-50 mb-2 max-h-96 w-[calc(100vw-1.5rem)] max-w-80 overflow-y-auto rounded-2xl glass-panel p-2"
            >
              {(data?.notifications || []).length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] p-4 text-center">No notifications yet.</p>
              ) : (
                data.notifications.map((n) => (
                  <div key={n._id} className="p-3 rounded-xl hover:bg-white/[0.04] text-sm">
                    <p className="text-[var(--text-primary)]">{n.message}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                ))
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
