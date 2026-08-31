import mongoose from 'mongoose';

const { Schema } = mongoose;

const leadSchema = new Schema(
  {
    businessName: { type: String, required: true, trim: true, index: true },
    industry: { type: String, trim: true, index: true },
    category: { type: String, trim: true, index: true },

    contactPerson: { type: String, trim: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    website: { type: String, trim: true },

    address: { type: String, trim: true },
    city: { type: String, trim: true, index: true },
    state: { type: String, trim: true, index: true },
    country: { type: String, trim: true, index: true },
    postalCode: { type: String, trim: true },

    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: undefined }, // [lng, lat]
    },

    googleRating: { type: Number, min: 0, max: 5 },
    reviewCount: { type: Number, min: 0 },

    tags: { type: [String], default: [] },
    notes: { type: String, trim: true },

    source: {
      type: String,
      enum: ['google_places', 'overpass', 'foursquare', 'apollo', 'manual'],
      required: true,
    },
    enrichmentStatus: {
      type: String,
      enum: ['none', 'pending', 'company_enriched', 'contacts_enriched', 'enriched', 'partial', 'failed'],
      default: 'none',
    },

    duplicateOf: { type: Schema.Types.ObjectId, ref: 'Lead', default: null },
    dedupeKey: { type: String, index: true }, // normalized businessName+city+postalCode hash

    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },

    // Activity/notes timeline — who contacted this lead, when, outcome.
    // Embedded rather than a separate collection since it's always read
    // together with the lead and never queried independently.
    activity: {
      type: [
        {
          type: { type: String, enum: ['note', 'call', 'email', 'status_change'], default: 'note' },
          text: { type: String, required: true, trim: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    isDeleted: { type: Boolean, default: false, index: true },

    leadScore: { type: Number, min: 0, max: 100, index: true },
  },
  { timestamps: true }
);

leadSchema.index({ location: '2dsphere' });
leadSchema.index({ projectId: 1, isDeleted: 1 });
leadSchema.index({ businessName: 'text', notes: 'text' });

// Soft-delete helper so controllers never write raw `find({})` and forget the flag
leadSchema.query.notDeleted = function () {
  return this.where({ isDeleted: false });
};

export const Lead = mongoose.model('Lead', leadSchema);
