import { Lead } from '../models/Lead.model.js';
import { Company } from '../models/Company.model.js';
import { Contact } from '../models/Contact.model.js';
import { CompanyProject } from '../models/CompanyProject.model.js';
import { ExportRecord } from '../models/index.js';

export async function createExport(req, res, next) {
  try {
    const { projectId, format = 'csv', columns } = req.body;
    const leads = await Lead.find({ projectId, isDeleted: false }).lean();
    const companyIds = leads.map((l) => l.companyId).filter(Boolean);
    const [companies, contacts, projects] = await Promise.all([
      Company.find({ _id: { $in: companyIds } }).lean(),
      Contact.find({ companyId: { $in: companyIds } }).lean(),
      CompanyProject.find({ companyId: { $in: companyIds } }).lean(),
    ]);
    const companyMap = new Map(companies.map((c) => [String(c._id), c]));
    const contactsMap = new Map();
    for (const c of contacts) {
      const key = String(c.companyId);
      const arr = contactsMap.get(key) || [];
      arr.push(c);
      contactsMap.set(key, arr);
    }
    const projectMap = new Map();
    for (const p of projects) {
      const key = String(p.companyId);
      const arr = projectMap.get(key) || [];
      arr.push(p);
      projectMap.set(key, arr);
    }

    const enrichedRows = leads.map((lead) => {
      const company = companyMap.get(String(lead.companyId));
      const companyContacts = contactsMap.get(String(lead.companyId)) || [];
      const companyProjects = projectMap.get(String(lead.companyId)) || [];
      return {
        companyName: lead.businessName,
        website: company?.website || lead.website || '',
        domain: company?.domain || '',
        industry: company?.industry || lead.industry || '',
        employeeCount: company?.employeeCount || '',
        employeeRange: company?.employeeRange || '',
        revenue: company?.revenue || '',
        headquarters: company?.headquarters ? [company.headquarters.city, company.headquarters.state, company.headquarters.country].filter(Boolean).join(', ') : '',
        companyPhone: company?.phone || lead.phone || '',
        companyEmail: company?.email || lead.email || '',
        companyLinkedIn: company?.linkedinUrl || '',
        leadScore: lead.leadScore ?? '',
        pocNames: companyContacts.map((c) => c.fullName).join(' | '),
        pocTitles: companyContacts.map((c) => c.title).filter(Boolean).join(' | '),
        pocEmails: companyContacts.map((c) => c.email).filter(Boolean).join(' | '),
        pocPhones: companyContacts.map((c) => c.phone).filter(Boolean).join(' | '),
        pocLinkedIns: companyContacts.map((c) => c.linkedinUrl).filter(Boolean).join(' | '),
        projects: companyProjects.map((p) => p.name).join(' | '),
        enrichmentStatus: lead.enrichmentStatus,
      };
    });

    const selectedColumns = columns?.length ? columns : Object.keys(enrichedRows[0] || {});
    let payload;
    let contentType;
    if (format === 'json') {
      payload = JSON.stringify(enrichedRows.map((l) => pick(l, selectedColumns)), null, 2);
      contentType = 'application/json';
    } else if (format === 'csv') {
      payload = toCsv(enrichedRows, selectedColumns);
      contentType = 'text/csv';
    } else {
      return res.status(501).json({ error: 'XLSX export is not yet wired — use CSV or JSON' });
    }

    await ExportRecord.create({ projectId, format, columnsSelected: selectedColumns });
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="leads-intelligence-export.${format}"`);
    res.send(payload);
  } catch (err) { next(err); }
}

function pick(obj, keys) { return keys.reduce((acc, k) => { if (k in obj) acc[k] = obj[k]; return acc; }, {}); }
function toCsv(rows, columns) {
  const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  return [columns.map(escape).join(','), ...rows.map((row) => columns.map((c) => escape(row[c])).join(','))].join('\n');
}
