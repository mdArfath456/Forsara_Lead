import { Lead } from '../models/Lead.model.js';
import { Project } from '../models/Project.model.js';
import { SearchHistory, ExportRecord } from '../models/index.js';
import { Company } from '../models/Company.model.js';
import { Contact } from '../models/Contact.model.js';
import { EnrichmentJob } from '../models/EnrichmentJob.model.js';

export async function getSummary(req, res, next) {
  try {
    const [totalProjects, totalLeads, totalCompanies, totalContacts, activeEnrichmentJobs, recentSearches, exportCount, industryDist, countryDist] = await Promise.all([
      Project.countDocuments({ isDeleted: false }),
      Lead.countDocuments({ isDeleted: false }),
      Company.countDocuments(),
      Contact.countDocuments(),
      EnrichmentJob.countDocuments({ status: { $in: ['queued', 'running', 'company_enriching', 'people_discovering', 'people_enriching', 'researching'] } }),
      SearchHistory.find().sort({ executedAt: -1 }).limit(10),
      ExportRecord.countDocuments(),
      Lead.aggregate([
        { $match: { isDeleted: false, industry: { $ne: null } } },
        { $group: { _id: '$industry', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Lead.aggregate([
        { $match: { isDeleted: false, country: { $ne: null } } },
        { $group: { _id: '$country', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.json({
      totalProjects,
      totalLeads,
      totalCompanies,
      totalContacts,
      activeEnrichmentJobs,
      recentSearches,
      exportCount,
      industryDistribution: industryDist,
      countryDistribution: countryDist,
    });
  } catch (err) {
    next(err);
  }
}
