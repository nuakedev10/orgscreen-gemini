import { Request, Response } from 'express';
import Candidate from '../models/Candidate';
import { parseCSV, parsePDF, cleanupFile } from '../services/fileParserService';
import mongoose from 'mongoose';

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
