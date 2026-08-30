import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { LoadingState, ErrorState } from '../components/StatusStates';

export default function ExportPage() {
  const [projectId, setProjectId] = useState('');
  const [format, setFormat] = useState('csv');
  const [downloading, setDownloading] = useState(false);

  const { data: projects, isLoading, isError, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.get('/projects').then((r) => r.data.projects),
  });

  async function handleExport() {
    setDownloading(true);
    try {
      const res = await apiClient.post('/export', { projectId, format }, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  if (isLoading) return <LoadingState label="Loading projects…" />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6 max-w-md">
      <h1 className="text-xl font-semibold">Export</h1>

      <div className="p-6 rounded-2xl glass-panel space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs text-gray-500">Project</label>
          <select className="glass-input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="" className="bg-surface-900">Select a project…</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id} className="bg-surface-900">
                {p.name} ({p.leadCount} leads)
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-gray-500">Format</label>
          <select className="glass-input" value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="csv" className="bg-surface-900">CSV</option>
            <option value="json" className="bg-surface-900">JSON</option>
            <option value="xlsx" className="bg-surface-900">XLSX (coming soon)</option>
          </select>
        </div>

        <button onClick={handleExport} disabled={!projectId || downloading} className="glass-button-primary w-full flex items-center justify-center gap-2">
          <Download size={15} />
          {downloading ? 'Preparing file…' : 'Download export'}
        </button>
      </div>
    </div>
  );
}
