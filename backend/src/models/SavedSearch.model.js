import mongoose from 'mongoose';

const { Schema } = mongoose;

const savedSearchSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    queryParams: { type: Schema.Types.Mixed, required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true }, // new leads land in this project
    frequency: { type: String, enum: ['daily', 'weekly'], default: 'weekly' },
    isActive: { type: Boolean, default: true },
    lastRunAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const notificationSchema = new Schema(
  {
    savedSearchId: { type: Schema.Types.ObjectId, ref: 'SavedSearch' },
    message: { type: String, required: true },
    newLeadCount: { type: Number, default: 0 },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const SavedSearch = mongoose.model('SavedSearch', savedSearchSchema);
export const Notification = mongoose.model('Notification', notificationSchema);
