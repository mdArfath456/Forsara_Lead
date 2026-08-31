import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';
import { LoadingState, ErrorState } from '../components/StatusStates';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiClient.get('/settings').then((r) => r.data.settings),
  });

  const [theme, setTheme] = useState('dark');
  const [radius, setRadius] = useState(10);
  const { data: apollo, isFetching: apolloLoading, refetch: checkApollo } = useQuery({
    queryKey: ['apollo-status'],
    queryFn: () => apiClient.get('/integrations/apollo/status').then((r) => r.data),
    retry: false,
  });

  useEffect(() => {
    if (data) {
      setTheme(data.theme);
      setRadius(data.defaultSearchRadiusKm);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: (payload) => apiClient.patch('/settings', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });

  if (isLoading) return <LoadingState label="Loading settings…" />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6 max-w-md">
      <h1 className="text-xl font-semibold">Settings</h1>

      <div className="p-6 rounded-2xl glass-panel space-y-4">
        <div className="rounded-xl border border-[var(--panel-border)] p-4 bg-white/[0.02]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Apollo API (optional fallback)</div>
              <div className="text-xs text-gray-500 mt-1">Server-side API-key authentication. The key is never exposed to the browser.</div>
            </div>
            <button type="button" onClick={() => checkApollo()} disabled={apolloLoading} className="glass-button-ghost text-xs">
              {apolloLoading ? 'Checking…' : 'Check connection'}
            </button>
          </div>
          {apollo && (
            <div className={`mt-3 text-xs ${apollo.ok ? 'text-emerald-400' : 'text-red-400'}`}>
              {apollo.ok ? '✓ Apollo API key is valid.' : `✕ ${apollo.message || 'Apollo API is unavailable.'}`}
              {apollo.status ? ` (HTTP ${apollo.status})` : ''}
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-gray-500">Theme</label>
          <select className="glass-input" value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="dark" className="bg-surface-900">Dark</option>
            <option value="light" className="bg-surface-900">Light</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-gray-500">Default search radius (km)</label>
          <input type="number" className="glass-input" value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
        </div>

        <button onClick={() => save.mutate({ theme, defaultSearchRadiusKm: radius })} disabled={save.isPending} className="glass-button-primary">
          {save.isPending ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}
