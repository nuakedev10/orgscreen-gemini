import mongoose, { Document, Schema } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  industry: string;
  cultureValues: string[];
  hiringPriorities: {
    skills: number;
    experience: number;
    education: number;
    cultureFit: number;
  };
  idealCandidatePersonas: string[];
  pastJobDescriptions: string[];
  knowledgeBase: string;
  createdAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>({
  name: { type: String, required: true },
  industry: { type: String, required: true },
  cultureValues: [{ type: String }],
  hiringPriorities: {
    skills: { type: Number, default: 40 },
    experience: { type: Number, default: 30 },
    education: { type: Number, default: 15 },
    cultureFit: { type: Number, default: 15 }
  },
  idealCandidatePersonas: [{ type: String }],
  pastJobDescriptions: [{ type: String }],
  knowledgeBase: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IOrganization>('Organization', OrganizationSchema);