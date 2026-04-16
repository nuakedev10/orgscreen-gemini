import mongoose, { Document, Schema } from 'mongoose';

export interface IJob extends Document {
  organizationId: mongoose.Types.ObjectId;
  title: string;
  department: string;
  experienceLevel: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  educationRequirement: string;
  responsibilities: string[];
  additionalNotes: string;
  status: 'open' | 'screening' | 'closed';
  createdAt: Date;
}

const JobSchema = new Schema<IJob>({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  title: { type: String, required: true },
  department: { type: String, default: '' },
  experienceLevel: { type: String, default: '' },
  requiredSkills: [{ type: String }],
  niceToHaveSkills: [{ type: String }],
  educationRequirement: { type: String, default: '' },
  responsibilities: [{ type: String }],
  additionalNotes: { type: String, default: '' },
  status: {
    type: String,
    enum: ['open', 'screening', 'closed'],
    default: 'open'
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IJob>('Job', JobSchema);