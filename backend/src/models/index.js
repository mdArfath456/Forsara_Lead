import mongoose from 'mongoose';

const { Schema } = mongoose;

const searchHistorySchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
    queryParams: { type: Schema.Types.Mixed, required: true },
    providerUsed: { type: String, required: true },
    resultCount: { type: Number, default: 0 },
    cacheHit: { type: Boolean, default: false },
    executedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const exportSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
    format: { type: String, enum: ['csv', 'xlsx', 'json'], required: true },
    columnsSelected: { type: [String], default: [] },
    fileRef: { type: String },
    exportedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const activityLogSchema = new Schema(
  {
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId },
    meta: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

const settingsSchema = new Schema(
  {
    companyInfo: {
      name: { type: String, default: 'Forsara Consultancy' },
      logoUrl: String,
      primaryColor: String,
    },
    defaultExportPreferences: {
      format: { type: String, enum: ['csv', 'xlsx', 'json'], default: 'csv' },
      columns: { type: [String], default: [] },
    },
    defaultSearchRadiusKm: { type: Number, default: 10 },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    apiProviderConfig: {
      discoveryPrimary: { type: String, default: 'google_places' },
      discoveryFallback: { type: String, default: 'foursquare' },
      enrichmentPrimary: { type: String, default: 'apollo' },
    },
  },
  { timestamps: true }
);

export const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema);
export const ExportRecord = mongoose.model('Export', exportSchema);
export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export const Settings = mongoose.model('Settings', settingsSchema);
