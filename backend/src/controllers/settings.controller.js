import { Settings } from '../models/index.js';

export async function getSettings(req, res, next) {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({}); // defaults from schema
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req, res, next) {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();
    Object.assign(settings, req.body);
    await settings.save();
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}
