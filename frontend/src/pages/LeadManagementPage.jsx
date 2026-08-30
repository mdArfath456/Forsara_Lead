import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Upload } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { DataTable } from '../components/DataTable';
import { LoadingState, EmptyState, ErrorState } from '../components/StatusStates';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { ScoreBadge } from '../components/ScoreBadge';
import { LeadDetailDrawer } from '../components/LeadDetailDrawer';

const COLUMNS = [
  { key: 'businessName', label: 'Business' },
  { key: 'score', label: 'Priority', render: (row) => <ScoreBadge score={row.score} scoreTier={row.scoreTier} /> },
  { key: 'city', label: 'City' },
  { key: 'companyId', label: 'Company', render: (row) => row.companyId ? <span className="text-xs text-brand-400">Enriched</span> : <span className="text-xs text-gray-600">Not enriched</span> },
  { key: 'phone', label: 'Phone' },
  {
    key: 'email',
    label: 'Email',
    render: (row) =>
      row.email ? (
        <span className="text-gray-200">{row.email}</span>
      ) : row.enrichmentStatus === 'pending' ? (
        <span className="text-xs text-brand-400">Enriching…</span>
      ) : row.enrichmentStatus === 'failed' ? (
        <span className="text-xs text-red-400">No email found</span>
      ) : (
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-gray-500">Not enriched</span>
      ),
  },
];

export default function LeadManagementPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 25, sortBy: 'createdAt' });
  const [detailLeadId, setDetailLeadId] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['leads', filters],
    queryFn: () => apiClient.get('/leads', { params: filters }).then((r) => r.data),
  });

  const bulkSelection = useBulkSelection(data?.leads || []);

  const bulkDelete = useMutation({
    mutationFn: (leadIds) => apiClient.post('/leads/bulk', { leadIds, action: 'delete' }),
    onSuccess: () => {
      bulkSelection.clear();
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const bulkEnrich = useMutation({
    mutationFn: async (leadIds) => {
      await Promise.all(leadIds.map((id) => apiClient.post(`/leads/${id}/enrich`).catch(() => null)));
    },
    onSuccess: () => {
      bulkSelection.clear();
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  async function handleCsvSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/leads/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImportResult(res.data);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    } catch (err) {
      setImportResult({ error: err.response?.data?.error || 'Import failed' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (isLoading) return <LoadingState label="Loading leads…" />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const selectedCount = bulkSelection.selectedIds.size;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Lead Management</h1>
          <p className="text-sm text-gray-500">Click a row to view company intelligence, POCs, projects and enrichment status.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            className="glass-input w-auto"
            value={filters.sortBy}
            onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value, page: 1 }))}
          >
            <option value="createdAt" className="bg-surface-900">Newest first</option>
            <option value="score" className="bg-surface-900">Priority score</option>
          </select>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCsvSelected} className="hidden" id="csv-upload" />
          <label htmlFor="csv-upload" className="glass-button-ghost flex items-center gap-1.5 cursor-pointer">
            <Upload size={14} />
            {importing ? 'Importing…' : 'Import CSV'}
          </label>
          {selectedCount > 0 && (
            <>
              <button onClick={() => bulkEnrich.mutate([...bulkSelection.selectedIds])} disabled={bulkEnrich.isPending} className="glass-button-primary flex items-center gap-1.5">
                <Sparkles size={14} />
                {bulkEnrich.isPending ? 'Enriching…' : `Enrich ${selectedCount}`}
              </button>
              <button onClick={() => bulkDelete.mutate([...bulkSelection.selectedIds])} className="glass-button-ghost text-red-400 border-red-400/20 hover:bg-red-400/10">
                Delete {selectedCount}
              </button>
            </>
          )}
        </div>
      </div>

      {importResult && (
        <div className={`text-sm p-3 rounded-xl ${importResult.error ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
          {importResult.error || `Imported ${importResult.imported} leads (${importResult.skippedDuplicates} duplicates, ${importResult.skippedNoName} skipped for missing name) into "${importResult.project.name}"`}
        </div>
      )}

      {data.leads.length === 0 ? (
        <EmptyState title="No leads yet" description="Run a search or import a CSV to start building your lead list." />
      ) : (
        <DataTable columns={COLUMNS} rows={data.leads} onRowClick={(row) => setDetailLeadId(row._id)} bulkSelection={bulkSelection} />
      )}

      <div className="flex justify-between text-sm text-gray-500">
        <span>{data.total} total leads</span>
        <div className="space-x-3">
          <button disabled={filters.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))} className="disabled:opacity-30 hover:text-gray-300">
            Prev
          </button>
          <button disabled={filters.page * filters.limit >= data.total} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))} className="disabled:opacity-30 hover:text-gray-300">
            Next
          </button>
        </div>
      </div>

      <LeadDetailDrawer leadId={detailLeadId} onClose={() => setDetailLeadId(null)} />
    </div>
  );
}
