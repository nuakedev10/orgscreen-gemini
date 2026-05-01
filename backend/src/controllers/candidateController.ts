import { Request, Response } from 'express';
import Candidate from '../models/Candidate';
import { parseCSV, parsePDF, cleanupFile } from '../services/fileParserService';
import { generateJson } from '../services/geminiService';
import mongoose from 'mongoose';

type ExtractedCandidate = {
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  skills?: string[];
  yearsOfExperience?: number;
  education?: { degree?: string; field?: string; institution?: string };
  workHistory?: { company?: string; role?: string; duration?: string; description?: string }[];
};

const buildExtractionPrompt = (resumeText: string) => `
You are a resume parser. Extract structured candidate data from the resume text below.

Return ONLY a single JSON object with this exact shape (no commentary, no markdown):
{
  "fullName": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "skills": ["string"],
  "yearsOfExperience": number,
  "education": { "degree": "string", "field": "string", "institution": "string" },
  "workHistory": [{ "company": "string", "role": "string", "duration": "string", "description": "string" }]
}

Rules:
- "fullName" and "email" are REQUIRED. If you can't find them, leave them as empty strings.
- "skills" should be an array of distinct technical/professional skills (max 25).
- "yearsOfExperience" is a number (estimate from work history if not stated; 0 if unknown).
- Use empty strings or empty arrays for fields you can't find. Never invent data.

Resume text:
"""
${resumeText.slice(0, 18000)}
"""
`;

export const addCandidates = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId, organizationId, candidates } = req.body;

    if (!jobId || !organizationId || !candidates || !Array.isArray(candidates)) {
      res.status(400).json({ error: 'jobId, organizationId, and candidates array are required' });
      return;
    }

    const candidateDocs = candidates.map((c: any) => ({
      ...c,
      jobId: new mongoose.Types.ObjectId(jobId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
      source: 'umurava'
    }));

    const saved = await Candidate.insertMany(candidateDocs);

    res.status(201).json({
      message: `${saved.length} candidates added successfully`,
      candidates: saved
    });
  } catch (error) {
    console.error('Add candidates error:', error);
    res.status(500).json({ error: 'Failed to add candidates' });
  }
};

export const uploadCSVCandidates = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { jobId, organizationId } = req.body;

    if (!jobId || !organizationId) {
      res.status(400).json({ error: 'jobId and organizationId are required' });
      return;
    }

    const parsed = parseCSV(req.file.path);

    const candidateDocs = parsed.map((c: any) => ({
      ...c,
      jobId: new mongoose.Types.ObjectId(jobId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
      source: 'upload'
    }));

    const saved = await Candidate.insertMany(candidateDocs);
    cleanupFile(req.file.path);

    res.status(201).json({
      message: `${saved.length} candidates imported from CSV`,
      candidates: saved
    });
  } catch (error) {
    console.error('CSV upload error:', error);
    res.status(500).json({ error: 'Failed to process CSV file' });
  }
};

export const uploadPDFCandidate = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { jobId, organizationId, fullName, email } = req.body;

    if (!jobId || !organizationId || !fullName || !email) {
      res.status(400).json({ error: 'jobId, organizationId, fullName, and email are required' });
      return;
    }

    const resumeText = await parsePDF(req.file.path);
    cleanupFile(req.file.path);

    const candidate = new Candidate({
      jobId: new mongoose.Types.ObjectId(jobId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
      fullName,
      email,
      resumeText,
      skills: [],
      yearsOfExperience: 0,
      education: { degree: '', field: '', institution: '' },
      workHistory: [],
      source: 'upload'
    });

    await candidate.save();

    res.status(201).json({
      message: 'PDF candidate added successfully',
      candidate
    });
  } catch (error) {
    console.error('PDF upload error:', error);
    res.status(500).json({ error: 'Failed to process PDF file' });
  }
};

export const uploadPDFCandidates = async (req: Request, res: Response): Promise<void> => {
  const files = (req.files as Express.Multer.File[] | undefined) || [];

  try {
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded. Attach one or more PDFs as "files".' });
      return;
    }

    const { jobId, organizationId } = req.body;

    if (!jobId || !organizationId) {
      files.forEach(f => cleanupFile(f.path));
      res.status(400).json({ error: 'jobId and organizationId are required' });
      return;
    }

    const results: Array<{
      filename: string;
      status: 'parsed' | 'failed';
      candidate?: any;
      reason?: string;
    }> = [];

    const candidateDocs: any[] = [];

    for (const file of files) {
      try {
        const resumeText = await parsePDF(file.path);

        if (!resumeText || resumeText.trim().length < 30) {
          results.push({
            filename: file.originalname,
            status: 'failed',
            reason: 'Could not extract readable text from this PDF.',
          });
          continue;
        }

        let extracted: ExtractedCandidate;
        try {
          extracted = await generateJson<ExtractedCandidate>(buildExtractionPrompt(resumeText));
        } catch (aiErr: any) {
          results.push({
            filename: file.originalname,
            status: 'failed',
            reason: aiErr?.message || 'AI extraction failed.',
          });
          continue;
        }

        const fullName = (extracted.fullName || '').trim();
        const email = (extracted.email || '').trim();

        if (!fullName || !email) {
          results.push({
            filename: file.originalname,
            status: 'failed',
            reason: 'Could not find a name and email in this resume.',
          });
          continue;
        }

        const doc = {
          jobId: new mongoose.Types.ObjectId(jobId),
          organizationId: new mongoose.Types.ObjectId(organizationId),
          fullName,
          email,
          phone: extracted.phone?.trim() || '',
          location: extracted.location?.trim() || '',
          skills: Array.isArray(extracted.skills)
            ? extracted.skills.map(s => String(s).trim()).filter(Boolean).slice(0, 25)
            : [],
          yearsOfExperience: Number(extracted.yearsOfExperience) || 0,
          education: {
            degree: extracted.education?.degree?.trim() || '',
            field: extracted.education?.field?.trim() || '',
            institution: extracted.education?.institution?.trim() || '',
          },
          workHistory: Array.isArray(extracted.workHistory)
            ? extracted.workHistory.map(w => ({
                company: w.company?.trim() || '',
                role: w.role?.trim() || '',
                duration: w.duration?.trim() || '',
                description: w.description?.trim() || '',
              }))
            : [],
          resumeText,
          source: 'upload' as const,
        };

        candidateDocs.push(doc);
        results.push({
          filename: file.originalname,
          status: 'parsed',
          candidate: {
            fullName: doc.fullName,
            email: doc.email,
            skills: doc.skills,
            yearsOfExperience: doc.yearsOfExperience,
          },
        });
      } catch (perFileErr: any) {
        console.error('PDF processing error for', file.originalname, perFileErr?.message || perFileErr);
        results.push({
          filename: file.originalname,
          status: 'failed',
          reason: perFileErr?.message || 'Unexpected error while processing this file.',
        });
      } finally {
        cleanupFile(file.path);
      }
    }

    let saved: any[] = [];
    if (candidateDocs.length > 0) {
      saved = await Candidate.insertMany(candidateDocs);
    }

    res.status(201).json({
      message: `Processed ${files.length} resume(s) — ${saved.length} imported, ${files.length - saved.length} failed.`,
      results,
      imported: saved.length,
      total: files.length,
    });
  } catch (error: any) {
    console.error('Bulk PDF upload error:', error);
    files.forEach(f => cleanupFile(f.path));
    res.status(500).json({ error: error?.message || 'Failed to process PDF files' });
  }
};

export const getCandidates = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.query;
    const filter = jobId ? { jobId } : {};
    const candidates = await Candidate.find(filter).sort({ createdAt: -1 });
    res.json({ candidates, total: candidates.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
};
export const updateCandidateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['hired', 'maybe', 'rejected'].includes(status)) {
      res.status(400).json({ error: 'Invalid status. Must be hired, maybe, or rejected' });
      return;
    }

    const candidate = await Candidate.findByIdAndUpdate(
      id,
      { decisionStatus: status },
      { new: true }
    );

    if (!candidate) {
      res.status(404).json({ error: 'Candidate not found' });
      return;
    }

    res.json({ message: 'Status updated', candidate });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update candidate status' });
  }
};
