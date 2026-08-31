import mongoose from 'mongoose';

const { Schema } = mongoose;

const contactSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', index: true },
    firstName: String,
    lastName: String,
    fullName: { type: String, required: true, trim: true },
    title: { type: String, trim: true, index: true },
    department: { type: String, trim: true },
    seniority: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    emailStatus: String,
    phone: String,
    mobilePhone: String,
    linkedinUrl: String,
    location: {
      city: String,
      state: String,
      country: String,
    },
    employmentHistory: [
      {
        organizationId: String,
        organizationName: String,
        title: String,
        startDate: Date,
        endDate: Date,
        current: Boolean,
      },
    ],
    provider: { type: String, default: 'apollo' },
    providerId: { type: String, index: true },
    enrichmentStatus: {
      type: String,
      enum: ['discovered', 'enriched', 'partial', 'failed'],
      default: 'discovered',
    },
    enrichedAt: Date,
    sourceMeta: {
      source: String,
      confidence: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
      updatedAt: { type: Date, default: Date.now },
    },
    rawProviderData: { type: Schema.Types.Mixed, select: false },
  },
  { timestamps: true }
);

contactSchema.index({ companyId: 1, providerId: 1 }, { unique: true, sparse: true });
contactSchema.index({ companyId: 1, email: 1 }, { unique: true, sparse: true });

export const Contact = mongoose.model('Contact', contactSchema);
