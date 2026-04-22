import { Request, Response } from 'express';
import Job from '../models/Job';
import Organization from '../models/Organization';
import { generateContent } from '../services/geminiService';
import { buildOrgContext } from '../services/promptService';

// Create a job
export const createJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      organizationId,
      title,
      department,
      experienceLevel,
      requiredSkills,
      niceToHaveSkills,
      educationRequirement,
      responsibilities,
      additionalNotes
    } = req.body;

    if (!organizationId || !title) {
      res.status(400).json({ error: 'Organization ID and job title are required' });
      return;
    }

    const org = await Organization.findById(organizationId);
    if (!org) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    const job = new Job({
      organizationId,
      title,
      department: department || '',
      experienceLevel: experienceLevel || '',
      requiredSkills: requiredSkills || [],
      niceToHaveSkills: niceToHaveSkills || [],
      educationRequirement: educationRequirement || '',
      responsibilities: responsibilities || [],
      additionalNotes: additionalNotes || '',
      status: 'open'
    });

    await job.save();

    res.status(201).json({
      message: 'Job created successfully',
      job
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
};

// Get all jobs for an organization
export const getJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId } = req.query;
    const filter = organizationId ? { organizationId } : {};
    const jobs = await Job.find(filter).sort({ createdAt: -1 });
    res.json({ jobs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
};

// Get single job
export const getJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const job = await Job.findById(req.params.id).populate('organizationId');
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json({ job });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch job' });
  }
};

// Generate job description using AI
export const generateJobDescription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobTitle, organizationId } = req.body;

    if (!jobTitle || !organizationId) {
      res.status(400).json({ error: 'jobTitle and organizationId are required' });
      return;
    }

    const org = await Organization.findById(organizationId);
    if (!org) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    const orgContext = buildOrgContext(org);

    const prompt = `You are an expert HR professional and job description writer.

${orgContext}

Generate a complete, detailed job description for the role: "${jobTitle}"

The description must be tailored to the organization's culture, values, and hiring priorities above.

Respond ONLY with valid JSON in this exact structure (no markdown, no code blocks):
{
  "department": "the most appropriate department for this role",
  "experienceLevel": "one of: Junior (0-2 years), Mid-level (2-5 years), Senior (5+ years), Lead / Principal",
  "educationRequirement": "education requirement tailored to this role and the organization",
  "requiredSkills": ["5-8 specific required skills"],
  "niceToHaveSkills": ["3-5 nice-to-have skills"],
  "responsibilities": ["5-8 key responsibilities"],
  "additionalNotes": "additional context or notes about this role at this organization"
}`;

    const raw = await generateContent(prompt);
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jobDescription = JSON.parse(cleaned);

    res.json({ jobDescription });
  } catch (error: any) {
    console.error('Generate job description error:', error);
    if (error instanceof SyntaxError) {
      res.status(500).json({ error: 'AI returned invalid JSON. Please try again.' });
    } else {
      res.status(500).json({ error: 'Failed to generate job description' });
    }
  }
};

// Update job status
export const updateJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true }
    );
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json({ message: 'Job updated', job });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update job' });
  }
};