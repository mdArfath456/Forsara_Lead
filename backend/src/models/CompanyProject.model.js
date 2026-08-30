import mongoose from 'mongoose';

const { Schema } = mongoose;

const companyProjectSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    location: String,
    industry: String,
    status: String,
    sourceUrl: { type: String, trim: true },
    sourceName: { type: String, trim: true },
    confidence: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    discoveredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

companyProjectSchema.index({ companyId: 1, name: 1, sourceUrl: 1 }, { unique: true, sparse: true });

export const CompanyProject = mongoose.model('CompanyProject', companyProjectSchema);
