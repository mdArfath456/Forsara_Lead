import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { DataTable } from '../components/DataTable';
import { LoadingState, EmptyState, ErrorState } from '../components/StatusStates';

const COLUMNS = [
  { key: 'name', label: 'Project' },
  { key: 'leadCount', label: 'Leads' },
  { key: 'createdAt', label: 'Created', render: (row) => new Date(row.createdAt).toLocaleDateString() },
];

export default function ProjectsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.get('/projects').then((r) => r.data.projects),
  });

  if (isLoading) return <LoadingState label="Loading projects…" />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Projects</h1>
        <p className="text-sm text-gray-500">Manage and export your lead collections.</p>
      </div>
      {data.length === 0 ? (
        <EmptyState title="No projects yet" description="Run a search to automatically create your first project." />
      ) : (
        <DataTable columns={COLUMNS} rows={data} />
      )}
    </div>
  );
}
