import mongoose from 'mongoose';

const { Schema } = mongoose;

const enrichmentJobSchema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
    status: {
      type: String,
      enum: ['queued', 'running', 'company_enriching', 'people_discovering', 'people_enriching', 'researching', 'completed', 'partial', 'failed'],
      default: 'queued',
      index: true,
    },
    steps: {
      company: { type: String, default: 'pending' },
      people: { type: String, default: 'pending' },
      research: { type: String, default: 'pending' },
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    error: String,
    retryCount: { type: Number, default: 0 },
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

enrichmentJobSchema.index({ status: 1, createdAt: 1 });

export const EnrichmentJob = mongoose.model('EnrichmentJob', enrichmentJobSchema);
