import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Clock } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { LoadingState, EmptyState, ErrorState } from '../components/StatusStates';

export default function SavedAlertsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['saved-searches'],
    queryFn: () => apiClient.get('/saved-searches').then((r) => r.data.savedSearches),
  });

  const remove = useMutation({
    mutationFn: (id) => apiClient.delete(`/saved-searches/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-searches'] }),
  });

  if (isLoading) return <LoadingState label="Loading alerts…" />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Saved Alerts</h1>
        <p className="text-sm text-gray-500">
          Searches saved from the Search Leads page. Each re-runs automatically on its schedule and notifies you when new leads appear.
        </p>
      </div>

      {data.length === 0 ? (
        <EmptyState
          title="No saved alerts yet"
          description='Go to Search Leads, fill in criteria, and click "Save as alert" to create one.'
        />
      ) : (
        <div className="space-y-3">
          {data.map((s) => (
            <div key={s._id} className="rounded-2xl glass-panel p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{s.name}</p>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                  <Clock size={12} />
                  {s.frequency} · last run: {s.lastRunAt ? new Date(s.lastRunAt).toLocaleString() : 'not yet run'}
                </div>
              </div>
              <button
                onClick={() => remove.mutate(s._id)}
                aria-label={`Delete alert ${s.name}`}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-400/10"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
