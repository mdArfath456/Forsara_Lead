import { Project } from '../models/Project.model.js';
import { Lead } from '../models/Lead.model.js';

export async function listProjects(req, res, next) {
  try {
    const projects = await Project.find({ isDeleted: false }).sort({ createdAt: -1 });
    res.json({ projects });
  } catch (err) {
    next(err);
  }
}

export async function getProject(req, res, next) {
  try {
    const project = await Project.findOne({ _id: req.params.id, isDeleted: false });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const leadCount = await Lead.countDocuments({ projectId: project._id, isDeleted: false });
    res.json({ project, leadCount });
  } catch (err) {
    next(err);
  }
}

export async function createProject(req, res, next) {
  try {
    const project = await Project.create({ name: req.body.name, description: req.body.description });
    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
}
