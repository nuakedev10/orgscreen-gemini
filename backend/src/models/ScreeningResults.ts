import mongoose, { Document, Schema } from 'mongoose';

export interface ICandidateScore {
  candidateId: mongoose.Types.ObjectId;
  fullName: string;
  rank: number;
  overallScore: number;
  dimensionScores: {
    skills: number;
    experience: number;
    education: number;
    cultureFit: number;
  };
  strengths: string[];
  gaps: string[];
  biasFlags: string[];
  recommendation: 'Strong Hire' | 'Hire' | 'Maybe' | 'No Hire';
  reasoning: string;
}

export interface IScreeningResult extends Document {
  jobId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  shortlistSize: number;
  candidates: ICandidateScore[];
  aiModel: string;
  promptVersion: string;
  createdAt: Date;
}

const ScreeningResultSchema = new Schema<IScreeningResult>({
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
  shortlistSize: { type: Number, default: 10 },
  candidates: [{
    candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate' },
    fullName: String,
    rank: Number,
    overallScore: Number,
    dimensionScores: {
      skills: Number,
      experience: Number,
      education: Number,
      cultureFit: Number
    },
    strengths: [String],
    gaps: [String],
    biasFlags: [String],
    recommendation: {
      type: String,
      enum: ['Strong Hire', 'Hire', 'Maybe', 'No Hire']
    },
    reasoning: String
  }],
  aiModel: { type: String, default: 'gemini-1.5-pro' },
  promptVersion: { type: String, default: 'v1' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IScreeningResult>(
  'ScreeningResult',
  ScreeningResultSchema
);