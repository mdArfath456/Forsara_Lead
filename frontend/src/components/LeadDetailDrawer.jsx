import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, Globe, MapPin, Sparkles, Send, Building2, Users, BriefcaseBusiness, Linkedin, Mail, RefreshCw } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { ScoreBadge } from './ScoreBadge';
import { LoadingState } from './StatusStates';

function Empty({ children = 'Not available' }) {
  return <span className="text-xs text-gray-600">{children}</span>;
}

export function LeadDetailDrawer({ leadId, onClose }) {
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => apiClient.get(`/leads/${leadId}`).then((r) => r.data.lead),
    enabled: Boolean(leadId),
  });

  const { data: statusData } = useQuery({
    queryKey: ['enrichment-status', leadId],
    queryFn: () => apiClient.get(`/leads/${leadId}/enrichment-status`).then((r) => r.data.job),
    enabled: Boolean(leadId),
    refetchInterval: (query) => ['queued', 'running', 'company_enriching', 'people_discovering', 'people_enriching', 'researching'].includes(query.state.data?.status) ? 2000 : false,
  });

  const { data: companyData } = useQuery({
    queryKey: ['company', data?.companyId?._id || data?.companyId],
    queryFn: () => apiClient.get(`/companies/${data.companyId._id || data.companyId}`).then((r) => r.data),
    enabled: Boolean(data?.companyId),
    refetchInterval: ['queued', 'running', 'company_enriching', 'people_discovering', 'people_enriching', 'researching'].includes(statusData?.status) ? 2000 : false,
  });

  const enrich = useMutation({
    mutationFn: () => apiClient.post(`/leads/${leadId}/enrich`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['enrichment-status', leadId] });
      queryClient.invalidateQueries({ queryKey: ['company', data?.companyId?._id || data?.companyId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const addNote = useMutation({
    mutationFn: (text) => apiClient.post(`/leads/${leadId}/notes`, { text }),
    onSuccess: () => {
      setNoteText('');
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const company = companyData?.company;
  const contacts = companyData?.contacts || [];
  const projects = companyData?.projects || [];
  const job = statusData;
  const isBusy = ['queued', 'running', 'company_enriching', 'people_discovering', 'people_enriching', 'researching'].includes(job?.status);

  return (
    <AnimatePresence>
      {leadId && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 z-50" />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }} className="fixed right-0 top-0 h-full w-full max-w-2xl z-50 glass-panel overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-[var(--panel-border)] bg-surface-950/90 backdrop-blur">
              <div>
                <p className="text-xs text-gray-500">Company Intelligence</p>
                <h2 className="font-semibold">{data?.businessName || 'Lead Details'}</h2>
              </div>
              <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/[0.06]"><X size={16} /></button>
            </div>

            {isLoading || !data ? <LoadingState label="Loading company intelligence…" /> : (
              <div className="p-5 space-y-6">
                <section className="rounded-xl border border-[var(--panel-border)] p-4 bg-white/[0.02]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold">{data.businessName}</h3>
                      <p className="text-sm text-gray-500 mt-1">{company?.industry || data.category || data.industry || 'Industry not available'}</p>
                    </div>
                    <ScoreBadge score={data.score} scoreTier={data.scoreTier} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                    <div className="p-3 rounded-lg bg-white/[0.03]"><div className="text-xs text-gray-500">Employees</div><div className="mt-1">{company?.employeeRange || company?.employeeCount || <Empty />}</div></div>
                    <div className="p-3 rounded-lg bg-white/[0.03]"><div className="text-xs text-gray-500">Revenue</div><div className="mt-1">{company?.revenue ? `${company.revenueCurrency || ''} ${company.revenue}` : company?.revenueRange || <Empty />}</div></div>
                    <div className="p-3 rounded-lg bg-white/[0.03]"><div className="text-xs text-gray-500">Founded</div><div className="mt-1">{company?.foundedYear || <Empty />}</div></div>
                    <div className="p-3 rounded-lg bg-white/[0.03]"><div className="text-xs text-gray-500">POCs</div><div className="mt-1">{contacts.length}</div></div>
                  </div>
                </section>

                <section className="space-y-2 text-sm">
                  <h4 className="flex items-center gap-2 font-medium"><Building2 size={15} /> Company</h4>
                  <p className="text-gray-400 leading-6">{company?.description || <Empty>Description not available</Empty>}</p>
                  <div className="space-y-2 pt-1">
                    {(company?.phone || data.phone) && <div className="flex items-center gap-2 text-gray-300"><Phone size={14} className="text-gray-500" /> {company?.phone || data.phone}</div>}
                    {(company?.email || data.email) && <div className="flex items-center gap-2 text-gray-300"><Mail size={14} className="text-gray-500" /> {company?.email || data.email}</div>}
                    {(company?.website || data.website) && <div className="flex items-center gap-2 text-gray-300"><Globe size={14} className="text-gray-500" /> <a className="hover:text-brand-400" href={company?.website || data.website} target="_blank" rel="noreferrer">{company?.website || data.website}</a></div>}
                    {company?.linkedinUrl && <div className="flex items-center gap-2 text-gray-300"><Linkedin size={14} className="text-gray-500" /> <a className="hover:text-brand-400" href={company.linkedinUrl} target="_blank" rel="noreferrer">LinkedIn</a></div>}
                    {(data.city || data.country || company?.headquarters?.city) && <div className="flex items-center gap-2 text-gray-300"><MapPin size={14} className="text-gray-500" /> {[company?.headquarters?.city || data.city, company?.headquarters?.state || data.state, company?.headquarters?.country || data.country].filter(Boolean).join(', ')}</div>}
                  </div>
                </section>

                {(company?.technologies?.length || company?.services?.length || company?.products?.length || company?.funding?.totalFunding) ? (
                  <section className="space-y-4">
                    {company?.technologies?.length > 0 && <div><h4 className="text-sm font-medium mb-2">Technologies</h4><div className="flex flex-wrap gap-2">{company.technologies.slice(0, 40).map((tech, i) => <span key={`tech-${i}`} className="px-2 py-1 rounded-md bg-white/[0.04] text-xs text-gray-400">{tech}</span>)}</div></div>}
                    {company?.services?.length > 0 && <div><h4 className="text-sm font-medium mb-2">Services</h4><p className="text-sm text-gray-400">{company.services.join(' · ')}</p></div>}
                    {company?.products?.length > 0 && <div><h4 className="text-sm font-medium mb-2">Products</h4><p className="text-sm text-gray-400">{company.products.join(' · ')}</p></div>}
                    {company?.funding?.totalFunding && <div><h4 className="text-sm font-medium mb-2">Funding</h4><p className="text-sm text-gray-400">{company.funding.currency || 'USD'} {company.funding.totalFunding.toLocaleString()}</p></div>}
                  </section>
                ) : null}

                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="flex items-center gap-2 font-medium"><Sparkles size={15} /> Enrichment</h4>
                    <button onClick={() => enrich.mutate()} disabled={isBusy || enrich.isPending} className="glass-button-ghost flex items-center gap-2 text-xs disabled:opacity-50">
                      {isBusy ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />} {isBusy ? `${job?.progress || 0}%` : 'Enrich company, people & projects'}
                    </button>
                  </div>
                  {job && <div className="text-xs text-gray-500 space-y-1"><div className="flex justify-between"><span>{job.status}</span><span>{job.progress}%</span></div><div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full bg-brand-500 transition-all" style={{ width: `${job.progress}%` }} /></div><div>Company: {job.steps?.company || 'pending'} · People: {job.steps?.people || 'pending'} · Research: {job.steps?.research || 'pending'}</div></div>}
                </section>

                <section>
                  <h4 className="flex items-center gap-2 font-medium mb-3"><Users size={15} /> Points of Contact ({contacts.length})</h4>
                  <div className="space-y-3">
                    {contacts.length === 0 ? <Empty>No POCs discovered yet</Empty> : contacts.map((person) => (
                      <div key={person._id} className="rounded-xl border border-[var(--panel-border)] p-3 bg-white/[0.02]">
                        <div className="flex items-start justify-between gap-2"><div><div className="font-medium">{person.fullName}</div><div className="text-xs text-gray-500 mt-0.5">{person.title || 'Title unavailable'}{person.seniority ? ` · ${person.seniority}` : ''}</div></div><span className="text-[10px] uppercase tracking-wide text-gray-600">{person.enrichmentStatus}</span></div>
                        <div className="mt-2 space-y-1 text-xs text-gray-400">
                          {person.email ? <div className="flex gap-2"><Mail size={12} /> {person.email} {person.emailStatus ? `(${person.emailStatus})` : ''}</div> : null}
                          {person.phone && <div className="flex gap-2"><Phone size={12} /> {person.phone}</div>}
                          {person.linkedinUrl && <a className="flex gap-2 hover:text-brand-400" href={person.linkedinUrl} target="_blank" rel="noreferrer"><Linkedin size={12} /> LinkedIn</a>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="flex items-center gap-2 font-medium mb-3"><BriefcaseBusiness size={15} /> Company Projects / Intelligence ({projects.length})</h4>
                  <div className="space-y-3">
                    {projects.length === 0 ? <Empty>No public project/case-study pages discovered yet</Empty> : projects.map((project) => (
                      <div key={project._id} className="rounded-xl border border-[var(--panel-border)] p-3 bg-white/[0.02]">
                        <div className="font-medium text-sm">{project.name}</div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-4">{project.description || 'No description available'}</p>
                        {project.sourceUrl && <a className="inline-block text-xs text-brand-400 mt-2 hover:underline" href={project.sourceUrl} target="_blank" rel="noreferrer">View source</a>}
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Activity timeline</h4>
                  <div className="space-y-3">
                    {(data.activity || []).length === 0 && <p className="text-sm text-gray-600">No activity logged yet.</p>}
                    {[...(data.activity || [])].reverse().map((entry, i) => <div key={`${entry.createdAt}-${i}`} className="text-sm border-l-2 border-brand-500/30 pl-3"><p className="text-gray-300">{entry.text}</p><p className="text-xs text-gray-600">{new Date(entry.createdAt).toLocaleString()}</p></div>)}
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); if (noteText.trim()) addNote.mutate(noteText); }} className="mt-3 flex gap-2">
                    <input className="glass-input" placeholder="Add a note — call outcome, follow-up, etc." value={noteText} onChange={(e) => setNoteText(e.target.value)} />
                    <button type="submit" disabled={addNote.isPending} className="w-9 h-9 shrink-0 rounded-lg bg-brand-gradient flex items-center justify-center disabled:opacity-50"><Send size={14} className="text-white" /></button>
                  </form>
                </section>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
