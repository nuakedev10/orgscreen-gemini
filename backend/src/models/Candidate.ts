import mongoose, { Document, Schema } from 'mongoose';

export interface ICandidate extends Document {
  jobId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  skills: string[];
  yearsOfExperience: number;
  education: {
    degree: string;
    field: string;
    institution: string;
  };
  workHistory: {
    company: string;
    role: string;
    duration: string;
    description: string;
  }[];
  resumeText?: string;
  source: 'umurava' | 'upload';
  decisionStatus?: 'hired' | 'maybe' | 'rejected' | null;
  createdAt: Date;
}

const CandidateSchema = new Schema<ICandidate>({
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  location: { type: String },
  skills: [{ type: String }],
  yearsOfExperience: { type: Number, default: 0 },
  education: {
    degree: { type: String, default: '' },
    field: { type: String, default: '' },
    institution: { type: String, default: '' }
  },
  workHistory: [{
    company: String,
    role: String,
    duration: String,
    description: String
  }],
  resumeText: { type: String },
  source: {
    type: String,
    enum: ['umurava', 'upload'],
    required: true
  },
  decisionStatus: {
    type: String,
    enum: ['hired', 'maybe', 'rejected'],
    default: null
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<ICandidate>('Candidate', CandidateSchema);
