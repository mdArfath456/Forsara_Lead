import mongoose from 'mongoose';

const { Schema } = mongoose;

const sourceMetaSchema = new Schema(
  {
    source: { type: String, trim: true },
    confidence: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const locationSchema = new Schema(
  {
    address: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
    latitude: Number,
    longitude: Number,
  },
  { _id: false }
);

const companySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    legalName: { type: String, trim: true },
    domain: { type: String, trim: true, lowercase: true },
    website: { type: String, trim: true },
    description: { type: String, trim: true },
    industry: { type: String, trim: true, index: true },
    category: { type: String, trim: true },
    subcategories: { type: [String], default: [] },
    employeeCount: { type: Number, min: 0 },
    employeeRange: { type: String, trim: true },
    revenue: { type: Number, min: 0 },
    revenueRange: { type: String, trim: true },
    revenueCurrency: { type: String, trim: true },
    foundedYear: { type: Number, min: 1000, max: 2200 },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    linkedinUrl: { type: String, trim: true },
    headquarters: { type: locationSchema },
    locations: { type: [locationSchema], default: [] },
    technologies: { type: [String], default: [] },
    products: { type: [String], default: [] },
    services: { type: [String], default: [] },
    industriesServed: { type: [String], default: [] },
    socialProfiles: { type: Map, of: String, default: {} },
    funding: {
      totalFunding: Number,
      currency: String,
      lastRoundType: String,
      lastRoundAmount: Number,
      lastRoundDate: Date,
    },
    parentCompany: {
      name: String,
      domain: String,
      providerId: String,
    },
    subsidiaries: [
      {
        name: String,
        domain: String,
        providerId: String,
      },
    ],
    source: { type: String, default: 'discovery' },
    provider: { type: String, default: 'explorium' },
    providerId: { type: String, index: true },
    sourceMeta: { type: sourceMetaSchema },
    rawProviderData: { type: Schema.Types.Mixed, select: false },
    enrichmentStatus: {
      type: String,
      enum: ['none', 'pending', 'partial', 'enriched', 'failed'],
      default: 'none',
      index: true,
    },
    enrichedAt: Date,
    lastError: String,
  },
  { timestamps: true }
);

companySchema.index({ domain: 1 }, { unique: true, sparse: true });
companySchema.index({ name: 1, 'headquarters.city': 1 });

export const Company = mongoose.model('Company', companySchema);
