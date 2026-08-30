import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

import * as auth from '../controllers/auth.controller.js';
import { runSearch } from '../controllers/search.controller.js';
import * as leads from '../controllers/lead.controller.js';
import * as projects from '../controllers/project.controller.js';
import { getSummary } from '../controllers/analytics.controller.js';
import { createExport } from '../controllers/export.controller.js';
import * as settings from '../controllers/settings.controller.js';
import { importCsv } from '../controllers/import.controller.js';
import * as savedSearches from '../controllers/savedSearch.controller.js';
import * as companies from '../controllers/company.controller.js';
import { getApolloStatus, getExploriumStatus } from '../controllers/integration.controller.js';
import { searchCompanies } from '../controllers/companySearch.controller.js';

export const router = Router();


// Auth
router.post('/auth/login', auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', auth.me);

// Everything below requires an authenticated session
router.use(requireAuth);

// Search / discovery
router.post('/search', runSearch);

// Leads
router.get('/leads', leads.listLeads);
router.get('/leads/:id', leads.getLead);
router.patch('/leads/:id', leads.updateLead);
router.delete('/leads/:id', leads.deleteLead);
router.post('/leads/bulk', leads.bulkUpdateLeads);
router.post('/leads/:id/enrich', leads.enrichLead);
router.get('/leads/:id/enrichment-status', companies.getLeadEnrichmentStatus);
router.post('/leads/:id/notes', leads.addNote);
router.post('/leads/import', upload.single('file'), importCsv);

// Companies
router.get('/companies/search', searchCompanies);
router.post('/companies/select', companies.selectCompany);
router.get('/companies/:id', companies.getCompany);
router.get('/companies/:id/contacts', companies.listCompanyContacts);
router.get('/companies/:id/projects', companies.listCompanyProjects);

// Projects
router.get('/projects', projects.listProjects);
router.get('/projects/:id', projects.getProject);
router.post('/projects', projects.createProject);

// Analytics
router.get('/analytics/summary', getSummary);

// Export
router.post('/export', createExport);

// Settings
router.get('/settings', settings.getSettings);
router.patch('/settings', settings.updateSettings);
router.get('/integrations/apollo/status', getApolloStatus);
router.get('/integrations/explorium/status', getExploriumStatus);

// Saved search alerts + notifications
router.post('/saved-searches', savedSearches.createSavedSearch);
router.get('/saved-searches', savedSearches.listSavedSearches);
router.delete('/saved-searches/:id', savedSearches.deleteSavedSearch);
router.get('/notifications', savedSearches.listNotifications);
router.patch('/notifications/:id/read', savedSearches.markNotificationRead);
router.patch('/notifications/read-all', savedSearches.markAllNotificationsRead);
