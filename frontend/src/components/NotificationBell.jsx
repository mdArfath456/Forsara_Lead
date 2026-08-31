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
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 bottom-full z-50 mb-2 max-h-[24rem] w-[18rem] overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-[0_18px_40px_rgba(15,23,42,0.18)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Notifications</p>
                <p className="text-[11px] text-[var(--text-muted)]">{unreadCount} unread</p>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead.mutate()}
                  className="rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--text-primary)] hover:bg-white/5"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[18rem] overflow-y-auto p-2">
              {(data?.notifications || []).length === 0 ? (
                <div className="flex min-h-[8rem] items-center justify-center p-4 text-center">
                  <p className="text-sm text-[var(--text-muted)]">No notifications yet.</p>
                </div>
              ) : (
                data.notifications.map((n) => (
                  <div
                    key={n._id}
                    className="flex items-start gap-3 rounded-xl border border-transparent px-3 py-3 transition-colors hover:border-[var(--panel-border)] hover:bg-white/[0.03]"
                  >
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-5 text-[var(--text-primary)]">{n.message}</p>
                      <p className="mt-1 text-[11px] text-[var(--text-muted)]">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
