import { SavedSearch, Notification } from '../models/SavedSearch.model.js';
import { Project } from '../models/Project.model.js';

export async function createSavedSearch(req, res, next) {
  try {
    const { name, queryParams, frequency = 'weekly', projectId } = req.body;
    if (!name || !queryParams) {
      return res.status(400).json({ error: 'name and queryParams are required' });
    }

    let resolvedProjectId = projectId;
    if (!resolvedProjectId) {
      // No project yet (saving a search before ever running it) — create
      // one now so scheduled runs have somewhere to land new leads.
      const project = await Project.create({ name: `${name} (alert)`, searchCriteria: queryParams });
      resolvedProjectId = project._id;
    }

    const savedSearch = await SavedSearch.create({ name, queryParams, frequency, projectId: resolvedProjectId });
    res.status(201).json({ savedSearch });
  } catch (err) {
    next(err);
  }
}

export async function listSavedSearches(req, res, next) {
  try {
    const savedSearches = await SavedSearch.find().sort({ createdAt: -1 });
    res.json({ savedSearches });
  } catch (err) {
    next(err);
  }
}

export async function deleteSavedSearch(req, res, next) {
  try {
    const result = await SavedSearch.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Saved search not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function listNotifications(req, res, next) {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ isRead: false });
    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
}

export async function markNotificationRead(req, res, next) {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
