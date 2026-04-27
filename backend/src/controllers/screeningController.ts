import { Request, Response } from 'express';
import Organization from '../models/Organization';
import Job from '../models/Job';
import Candidate from '../models/Candidate';
import ScreeningResult from '../models/ScreeningResult';
import { runScreening } from '../services/screeningService';
import { generateContent } from '../services/geminiService';
import { buildOrgContext, buildJobContext } from '../services/promptService';
import { generateEmailContent, sendEmail } from '../services/emailService';
import PDFDocument from 'pdfkit';

export const triggerScreening = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId, organizationId, shortlistSize = 10 } = req.body;

    if (!jobId || !organizationId) {
      res.status(400).json({ error: 'jobId and organizationId are required' });
      return;
    }

    const [org, job, candidates] = await Promise.all([
      Organization.findById(organizationId),
      Job.findById(jobId),
      Candidate.find({ jobId, organizationId })
    ]);

    if (!org) { res.status(404).json({ error: 'Organization not found' }); return; }
    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }
    if (candidates.length === 0) { res.status(400).json({ error: 'No candidates found for this job' }); return; }

    await Job.findByIdAndUpdate(jobId, { status: 'screening' });

    const result = await runScreening(org, job, candidates, shortlistSize);

    const screeningResult = new ScreeningResult({
      jobId,
      organizationId,
      shortlistSize,
      candidates: result.shortlist,
      aiModel: 'gemini-2.5-flash',
      promptVersion: 'v1'
    });

    await screeningResult.save();
    await Job.findByIdAndUpdate(jobId, { status: 'closed' });

    res.status(200).json({
      message: 'Screening completed successfully',
      result: screeningResult,
      totalCandidatesScreened: result.totalCandidatesScreened,
      screeningNotes: result.screeningNotes
    });
  } catch (error: any) {
    console.error('Screening error:', error);
    res.status(500).json({
      error: 'Screening failed. Please try again.',
      detail: error?.message || String(error)
    });
  }
};

export const getScreeningResults = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const results = await ScreeningResult.findOne({ jobId }).sort({ createdAt: -1 });

    if (!results) {
      res.status(404).json({ error: 'No screening results found for this job' });
      return;
    }

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch screening results' });
  }
};

export const chatWithShortlist = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId, organizationId, message, conversationHistory = [] } = req.body;

    if (!jobId || !organizationId || !message) {
      res.status(400).json({ error: 'jobId, organizationId, and message are required' });
      return;
    }

    const [org, job, screeningResult] = await Promise.all([
      Organization.findById(organizationId),
      Job.findById(jobId),
      ScreeningResult.findOne({ jobId }).sort({ createdAt: -1 })
    ]);

    if (!org || !job || !screeningResult) {
      res.status(404).json({ error: 'Required data not found. Run screening first.' });
      return;
    }

    const orgContext = buildOrgContext(org);
    const jobContext = buildJobContext(job);

    const candidatesSummary = screeningResult.candidates.map((c: any, i: number) => `
Candidate ${i + 1}: ${c.fullName}
- Rank: ${c.rank} | Overall Score: ${c.overallScore}/100 | Recommendation: ${c.recommendation}
- Skills: ${c.dimensionScores.skills} | Experience: ${c.dimensionScores.experience} | Education: ${c.dimensionScores.education} | Culture Fit: ${c.dimensionScores.cultureFit}
- Strengths: ${c.strengths.join('; ')}
- Gaps: ${c.gaps.join('; ')}
- Bias Flags: ${c.biasFlags.length > 0 ? c.biasFlags.join('; ') : 'None'}
- Reasoning: ${c.reasoning}`).join('\n');

    const historyText = conversationHistory.length > 0
      ? conversationHistory.map((msg: any) => `${msg.role === 'user' ? 'Recruiter' : 'AI Advisor'}: ${msg.content}`).join('\n')
      : '';

    const prompt = `You are an expert talent advisor with deep knowledge of these specific candidates. Answer the recruiter's question with direct references to actual candidate names, scores, and data from the shortlist.

${orgContext}

${jobContext}

SHORTLISTED CANDIDATES:
${candidatesSummary}

${historyText ? `CONVERSATION HISTORY:\n${historyText}\n` : ''}
Recruiter's Question: ${message}

Respond as a knowledgeable talent advisor. Be specific — reference actual candidate names and scores. Keep response concise but insightful (2-4 paragraphs max).`;

    const response = await generateContent(prompt);
    res.json({ response });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to generate chat response' });
  }
};

export const downloadReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;

    const [job, screeningResult] = await Promise.all([
      Job.findById(jobId).populate('organizationId'),
      ScreeningResult.findOne({ jobId }).sort({ createdAt: -1 })
    ]);

    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }
    if (!screeningResult) { res.status(404).json({ error: 'No screening results found' }); return; }

    const org = job.organizationId as any;
    const sanitizedTitle = job.title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="OrgScreen-Shortlist-${sanitizedTitle}.pdf"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // Cover section
    doc.fillColor('#0066ff').fontSize(28).font('Helvetica-Bold').text('OrgScreen', 50, 50);
    doc.fillColor('#444444').fontSize(11).font('Helvetica').text('AI-Powered Talent Screening Report', 50, 85);

    doc.moveDown(2);
    doc.fillColor('#111111').fontSize(22).font('Helvetica-Bold').text(job.title, { align: 'center' });
    doc.moveDown(0.4);
    doc.fillColor('#555555').fontSize(12).font('Helvetica')
      .text(`${org?.name || 'Organization'} · ${job.department || 'All Departments'}`, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
    doc.text(`Total screened: ${(screeningResult as any).totalCandidatesScreened || screeningResult.candidates.length} · Shortlisted: ${screeningResult.candidates.length}`, { align: 'center' });

    doc.moveDown(1.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#0066ff').lineWidth(2).stroke();
    doc.moveDown(1.5);

    screeningResult.candidates.forEach((candidate: any, idx: number) => {
      if (doc.y > 680) doc.addPage();
      else if (idx > 0) {
        doc.moveDown(0.8);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#dddddd').lineWidth(0.5).stroke();
        doc.moveDown(0.8);
      }

      doc.fillColor('#0066ff').fontSize(13).font('Helvetica-Bold')
        .text(`#${candidate.rank}  ${candidate.fullName}`);

      const recColor = candidate.recommendation === 'Strong Hire' ? '#1b7a3c'
        : candidate.recommendation === 'Hire' ? '#2e7d32'
        : candidate.recommendation === 'Maybe' ? '#c17a00'
        : '#c62828';

      doc.fillColor(recColor).fontSize(10).font('Helvetica-Bold')
        .text(`${candidate.recommendation}  ·  Overall: ${candidate.overallScore}/100`);

      doc.moveDown(0.4);
      doc.fillColor('#444444').fontSize(9).font('Helvetica-Bold').text('Scores:');
      doc.fillColor('#333333').fontSize(9).font('Helvetica')
        .text(`  Skills ${candidate.dimensionScores.skills}  |  Experience ${candidate.dimensionScores.experience}  |  Education ${candidate.dimensionScores.education}  |  Culture Fit ${candidate.dimensionScores.cultureFit}`);

      if (candidate.strengths?.length > 0) {
        doc.moveDown(0.3);
        doc.fillColor('#444444').fontSize(9).font('Helvetica-Bold').text('Strengths:');
        candidate.strengths.forEach((s: string) => {
          doc.fillColor('#333333').fontSize(9).font('Helvetica').text(`  • ${s}`, { width: 495 });
        });
      }

      if (candidate.gaps?.length > 0) {
        doc.moveDown(0.3);
        doc.fillColor('#444444').fontSize(9).font('Helvetica-Bold').text('Gaps:');
        candidate.gaps.forEach((g: string) => {
          doc.fillColor('#333333').fontSize(9).font('Helvetica').text(`  • ${g}`, { width: 495 });
        });
      }

      if (candidate.biasFlags?.length > 0) {
        doc.moveDown(0.3);
        doc.fillColor('#b86000').fontSize(9).font('Helvetica-Bold').text('Fairness Flags:');
        candidate.biasFlags.forEach((f: string) => {
          doc.fillColor('#333333').fontSize(9).font('Helvetica').text(`  ⚑ ${f}`, { width: 495 });
        });
      }

      doc.moveDown(0.3);
      doc.fillColor('#444444').fontSize(9).font('Helvetica-Bold').text('AI Reasoning:');
      doc.fillColor('#333333').fontSize(9).font('Helvetica').text(`  ${candidate.reasoning}`, { width: 495 });
    });

    doc.moveDown(2);
    doc.fillColor('#aaaaaa').fontSize(8).font('Helvetica')
      .text(`Generated by OrgScreen · ${new Date().toISOString()}`, { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Report generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate report' });
    }
  }
};

export const previewDecisionEmails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId, organizationId } = req.body;

    if (!jobId || !organizationId) {
      res.status(400).json({ error: 'jobId and organizationId are required' });
      return;
    }

    const [org, job, candidates] = await Promise.all([
      Organization.findById(organizationId),
      Job.findById(jobId),
      Candidate.find({ jobId, decisionStatus: { $ne: null } })
    ]);

    if (!org || !job) { res.status(404).json({ error: 'Organization or Job not found' }); return; }
    if (candidates.length === 0) {
      res.status(400).json({ error: 'No candidates with decision statuses found. Mark at least one candidate first.' });
      return;
    }

    const hiredCandidates = candidates.filter((c: any) => c.decisionStatus === 'hired');
    const maybeCandidates = candidates.filter((c: any) => c.decisionStatus === 'maybe');
    const rejectedCandidates = candidates.filter((c: any) => c.decisionStatus === 'rejected');

    const previews: any = {};

    if (hiredCandidates.length > 0) {
      const sample = hiredCandidates[0];
      const content = await generateEmailContent(sample, 'hired', org, job);
      previews.hired = { ...content, candidateName: sample.fullName, count: hiredCandidates.length };
    }

    if (maybeCandidates.length > 0) {
      const sample = maybeCandidates[0];
      const content = await generateEmailContent(sample, 'maybe', org, job);
      previews.maybe = { ...content, candidateName: sample.fullName, count: maybeCandidates.length };
    }

    if (rejectedCandidates.length > 0) {
      const sample = rejectedCandidates[0];
      const content = await generateEmailContent(sample, 'rejected', org, job);
      previews.rejected = { ...content, candidateName: sample.fullName, count: rejectedCandidates.length };
    }

    res.json({ previews, totalCandidates: candidates.length });
  } catch (error) {
    console.error('Preview emails error:', error);
    res.status(500).json({ error: 'Failed to generate email previews' });
  }
};

export const confirmDecisionEmails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId, organizationId } = req.body;

    if (!jobId || !organizationId) {
      res.status(400).json({ error: 'jobId and organizationId are required' });
      return;
    }

    const [org, job, candidates] = await Promise.all([
      Organization.findById(organizationId),
      Job.findById(jobId),
      Candidate.find({ jobId, decisionStatus: { $ne: null } })
    ]);

    if (!org || !job) { res.status(404).json({ error: 'Organization or Job not found' }); return; }
    if (candidates.length === 0) {
      res.status(400).json({ error: 'No candidates with decision statuses found' });
      return;
    }

    let sent = 0;
    let failed = 0;

    await Promise.all(candidates.map(async (candidate: any) => {
      try {
        const emailContent = await generateEmailContent(candidate, candidate.decisionStatus, org, job);
        const success = await sendEmail(candidate.email, emailContent.subject, emailContent.body);
        if (success) sent++;
        else failed++;
      } catch (err) {
        console.error(`Email failed for ${candidate.fullName}:`, err);
        failed++;
      }
    }));

    res.json({ message: `${sent} emails sent successfully${failed > 0 ? `, ${failed} failed` : ''}`, sent, failed });
  } catch (error) {
    console.error('Confirm emails error:', error);
    res.status(500).json({ error: 'Failed to send emails' });
  }
};

export const rerankCandidates = async (req: Request, res: Response): Promise<void> => {
  try {
    const { resultId, weights } = req.body;

    const result = await ScreeningResult.findById(resultId);
    if (!result) {
      res.status(404).json({ error: 'Screening result not found' });
      return;
    }

    const reranked = result.candidates.map((candidate: any) => {
      const newScore =
        (candidate.dimensionScores.skills * weights.skills / 100) +
        (candidate.dimensionScores.experience * weights.experience / 100) +
        (candidate.dimensionScores.education * weights.education / 100) +
        (candidate.dimensionScores.cultureFit * weights.cultureFit / 100);

      return { ...candidate.toObject(), overallScore: Math.round(newScore) };
    });

    reranked.sort((a: any, b: any) => b.overallScore - a.overallScore);
    reranked.forEach((c: any, i: number) => { c.rank = i + 1; });

    res.json({ message: 'Candidates reranked successfully', candidates: reranked });
  } catch (error) {
    res.status(500).json({ error: 'Failed to rerank candidates' });
  }
};