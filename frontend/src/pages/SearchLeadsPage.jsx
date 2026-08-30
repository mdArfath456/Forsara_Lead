import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BellPlus, Building2, ChevronDown, Search } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { DataTable } from '../components/DataTable';
import { LoadingState, EmptyState, ErrorState } from '../components/StatusStates';
import { LeadDetailDrawer } from '../components/LeadDetailDrawer';

const ADVANCED_FIELDS = [
  ['industry', 'Industry'],
  ['category', 'Category'],
  ['country', 'Country'],
  ['state', 'State'],
  ['city', 'City'],
  ['postalCode', 'Postal code'],
  ['radiusKm', 'Radius (km)'],
];

const RESULT_COLUMNS = [
  { key: 'businessName', label: 'Business' },
  { key: 'category', label: 'Category' },
  { key: 'city', label: 'City' },
  { key: 'phone', label: 'Phone' },
  { key: 'website', label: 'Website' },
  { key: 'googleRating', label: 'Rating' },
];

export default function SearchLeadsPage() {
  const [query, setQuery] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [form, setForm] = useState({});
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [alertSaved, setAlertSaved] = useState(false);

  const { data: suggestions = [], isFetching: suggestionsLoading } = useQuery({
    queryKey: ['company-search', query],
    queryFn: () => apiClient.get('/companies/search', { params: { q: query } }).then((r) => r.data.companies || []),
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: (params) => apiClient.post('/search', params).then((r) => r.data),
    onSuccess: (data) => {
      setQuery(data.leads?.[0]?.businessName || query);
      setAlertSaved(false);
    },
  });

  const saveAlert = useMutation({
    mutationFn: () => apiClient.post('/saved-searches', {
      name: buildAlertName(form),
      queryParams: form,
      frequency: 'weekly',
      projectId: mutation.data?.project?._id,
    }),
    onSuccess: () => setAlertSaved(true),
  });

  useEffect(() => {
    if (query.trim().length < 2) return undefined;
    const timer = setTimeout(() => {}, 350);
    return () => clearTimeout(timer);
  }, [query]);

  function buildAlertName(f) {
    const bits = [f.businessName, f.keyword, f.category, f.city, f.country].filter(Boolean);
    return bits.length ? bits.join(' – ') : `Alert ${new Date().toLocaleDateString()}`;
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setAlertSaved(false);
  }

  const selectCompanyMutation = useMutation({
    mutationFn: (company) => apiClient.post('/companies/select', company).then((r) => r.data),
    onSuccess: (data) => {
      setQuery(data.company?.name || query);
      setSelectedLeadId(data.lead?._id);
      setAlertSaved(false);
    },
  });

  function selectCompany(company) {
    setForm((prev) => ({ ...prev, businessName: company.name, website: company.website || prev.website || '' }));
    setQuery(company.name);
    selectCompanyMutation.mutate(company);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const params = { ...form, businessName: query.trim() || form.businessName };
    mutation.mutate(params);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Find a Company</h1>
        <p className="text-sm text-gray-500">Search a company first. Select it to retrieve company intelligence, POCs, projects and lead score.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 rounded-2xl glass-panel space-y-4">
        <div className="relative">
          <label className="text-xs text-gray-500">Company name, domain or keyword</label>
          <div className="relative mt-1.5">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              autoFocus
              className="glass-input pl-9 pr-4 text-base"
              placeholder="e.g. Tata Technologies or tata.com"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {query.trim().length >= 2 && (suggestionsLoading || suggestions.length > 0) && (
            <div className="absolute left-6 right-6 mt-2 z-30 rounded-xl border border-[var(--panel-border)] bg-surface-900 shadow-2xl overflow-hidden">
              {(suggestionsLoading || selectCompanyMutation.isPending) && <div className="px-4 py-3 text-sm text-gray-500">Finding company intelligence…</div>}
              {!suggestionsLoading && suggestions.map((company, index) => (
                <button
                  type="button"
                  key={`${company.domain || company.name}-${index}`}
                  onClick={() => selectCompany(company)}
                  className="w-full text-left px-4 py-3 hover:bg-white/[0.05] border-b border-[var(--panel-border)] last:border-b-0 flex items-start gap-3"
                >
                  <Building2 size={18} className="mt-0.5 text-brand-400 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium truncate">{company.name}</span>
                    <span className="block text-xs text-gray-500 truncate">
                      {[company.industry || company.category, company.city, company.state, company.domain].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="button" onClick={() => setAdvanced((v) => !v)} className="text-sm text-gray-400 hover:text-gray-200 flex items-center gap-2">
          <ChevronDown size={15} className={advanced ? 'rotate-180' : ''} /> Advanced Filters
        </button>

        {advanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {ADVANCED_FIELDS.map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <label className="text-xs text-gray-500">{label}</label>
                <input className="glass-input" value={form[key] || ''} onChange={(e) => updateField(key, e.target.value)} />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={mutation.isPending || !query.trim()} className="glass-button-primary">
            {mutation.isPending ? 'Loading company…' : 'Search company'}
          </button>
          <button
            type="button"
            onClick={() => saveAlert.mutate()}
            disabled={saveAlert.isPending || alertSaved || (!query.trim() && Object.keys(form).length === 0)}
            className="glass-button-ghost flex items-center gap-1.5"
          >
            <BellPlus size={14} />
            {alertSaved ? 'Saved as weekly alert' : saveAlert.isPending ? 'Saving…' : 'Save as alert'}
          </button>
        </div>
      </form>

      {mutation.isPending && <LoadingState label="Identifying company and loading intelligence…" />}
      {mutation.isError && <ErrorState message="Company search failed. Check your discovery provider configuration." onRetry={() => mutation.mutate({ ...form, businessName: query.trim() })} />}
      {mutation.isSuccess && mutation.data.leads.length === 0 && <EmptyState title="No company found" description="Try the exact company name or its domain." />}
      {mutation.isSuccess && mutation.data.leads.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          <p className="text-sm text-gray-500">Select a company to open its full intelligence profile.</p>
          <DataTable
            columns={RESULT_COLUMNS}
            rows={mutation.data.leads}
            onRowClick={(row) => setSelectedLeadId(row._id)}
          />
        </motion.div>
      )}

      <LeadDetailDrawer leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
    </div>
  );
}
