import Papa from 'papaparse';
import { Lead } from '../models/Lead.model.js';
import { Project } from '../models/Project.model.js';
import { buildDedupeKey } from '../services/leadProviders/normalizeLead.js';
import { partitionNewAndDuplicateLeads } from '../utils/dedupe.js';

// Common header variants staff-provided spreadsheets tend to use, mapped to
// our schema field names. Add more aliases here as real uploads reveal them.
const HEADER_ALIASES = {
  businessname: 'businessName',
  business_name: 'businessName',
  company: 'businessName',
  companyname: 'businessName',
  name: 'businessName',
  industry: 'industry',
  category: 'category',
  contactperson: 'contactPerson',
  contact_person: 'contactPerson',
  contact: 'contactPerson',
  phone: 'phone',
  phonenumber: 'phone',
  email: 'email',
  emailaddress: 'email',
  website: 'website',
  url: 'website',
  address: 'address',
  city: 'city',
  state: 'state',
  province: 'state',
  country: 'country',
  postalcode: 'postalCode',
  zip: 'postalCode',
  zipcode: 'postalCode',
  notes: 'notes',
};

function normalizeHeader(header) {
  return header.toLowerCase().replace(/[\s_-]/g, '');
}

export async function importCsv(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded (field name: "file")' });
    }

    const csvText = req.file.buffer.toString('utf-8');
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

    if (parsed.errors.length) {
      return res.status(400).json({ error: 'CSV parsing failed', details: parsed.errors.slice(0, 5) });
    }
    if (!parsed.data.length) {
      return res.status(400).json({ error: 'CSV file has no data rows' });
    }

    // Build a header -> schema field map once, from the actual parsed headers
    const fieldMap = {};
    for (const rawHeader of parsed.meta.fields || []) {
      const normalized = normalizeHeader(rawHeader);
      const alias = Object.keys(HEADER_ALIASES).find((key) => normalizeHeader(key) === normalized);
      if (alias) fieldMap[rawHeader] = HEADER_ALIASES[alias];
    }

    if (!Object.values(fieldMap).includes('businessName')) {
      return res.status(400).json({
        error: 'CSV must include a business name column (e.g. "Business Name", "Company")',
      });
    }

    let project;
    if (req.body.projectId) {
      project = await Project.findOne({ _id: req.body.projectId, isDeleted: false });
      if (!project) return res.status(404).json({ error: 'Project not found' });
    } else {
      project = await Project.create({
        name: req.body.projectName || `CSV Import ${new Date().toLocaleDateString()}`,
      });
    }

    const normalized = parsed.data
      .map((row) => {
        const mapped = { source: 'manual', enrichmentStatus: 'none', projectId: project._id };
        for (const [rawHeader, field] of Object.entries(fieldMap)) {
          const value = row[rawHeader]?.trim();
          if (value) mapped[field] = value;
        }
        return mapped;
      })
      .filter((lead) => lead.businessName) // skip rows with no name at all
      .map((lead) => ({ ...lead, dedupeKey: buildDedupeKey(lead.businessName, lead.city, lead.postalCode) }));

    const { toInsert, flaggedCount } = await partitionNewAndDuplicateLeads(normalized, project._id);
    const inserted = toInsert.length ? await Lead.insertMany(toInsert) : [];

    project.leadCount += inserted.length;
    await project.save();

    res.json({
      project,
      imported: inserted.length,
      skippedDuplicates: flaggedCount,
      skippedNoName: parsed.data.length - normalized.length,
    });
  } catch (err) {
    err.publicMessage = 'CSV import failed — check the file format and try again';
    next(err);
  }
}
