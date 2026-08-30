import { useQuery } from '@tanstack/react-query';
import { FolderKanban, Users, Search as SearchIcon, Download } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { StatCard } from '../components/StatCard';
import { LoadingState, ErrorState } from '../components/StatusStates';

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => apiClient.get('/analytics/summary').then((r) => r.data),
  });

  if (isLoading) return <LoadingState label="Loading dashboard…" />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="max-w-full text-sm leading-6 text-gray-500">
          Overview of lead extraction performance and active tasks.
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Projects" value={data.totalProjects} icon={FolderKanban} />
        <StatCard index={1} label="Total leads" value={data.totalLeads} icon={Users} />
        <StatCard index={2} label="Recent searches" value={data.recentSearches.length} icon={SearchIcon} />
        <StatCard index={3} label="Exports generated" value={data.exportCount} icon={Download} />
      </div>

      <div>
        <h2 className="text-sm font-medium text-gray-400 mb-2">Recent searches</h2>
        <div className="min-w-0 rounded-2xl glass-panel divide-y divide-white/[0.06]">
          {data.recentSearches.length === 0 && <p className="p-4 text-sm text-gray-500">No searches yet.</p>}
          {data.recentSearches.map((s) => (
            <div key={s._id} className="flex min-w-0 items-center justify-between gap-3 p-3.5 text-sm">
              <span className="min-w-0 truncate text-gray-300">{s.providerUsed}</span>
              <span className="shrink-0 text-gray-500">{s.resultCount} results</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
