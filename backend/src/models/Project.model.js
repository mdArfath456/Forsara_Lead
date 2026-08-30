import mongoose from 'mongoose';

const { Schema } = mongoose;

const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    searchCriteria: { type: Schema.Types.Mixed }, // snapshot of the query that spawned this project
    leadCount: { type: Number, default: 0 },
    createdBy: { type: String, default: 'admin' }, // single seeded admin, no user collection
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const Project = mongoose.model('Project', projectSchema);
