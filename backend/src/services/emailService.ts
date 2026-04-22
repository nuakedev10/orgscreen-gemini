import nodemailer from 'nodemailer';
import { generateContent } from './geminiService';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const generateEmailContent = async (
  candidate: any,
  status: string,
  organization: any,
  job: any
): Promise<{ subject: string; body: string }> => {
  const statusContext = {
    hired: 'has been selected for the role and we would like to extend an offer',
    maybe: 'is being considered for a follow-up interview — express continued interest without making promises',
    rejected: 'will not be moving forward at this time — be respectful, encouraging, and leave the door open for future opportunities'
  };

  const prompt = `You are writing a professional hiring decision email on behalf of ${organization.name}.

Organization: ${organization.name}
Industry: ${organization.industry}
Culture Values: ${organization.cultureValues.join(', ')}

Candidate Name: ${candidate.fullName}
Candidate Email: ${candidate.email}
Job Title: ${job.title}
Decision: ${statusContext[status as keyof typeof statusContext] || status}

Write a professional, warm, and personalized email. The tone must reflect ${organization.name}'s culture values: ${organization.cultureValues.join(', ')}.

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "subject": "email subject line",
  "body": "full email body (use \\n for line breaks, address the candidate by first name)"
}`;

  const raw = await generateContent(prompt);
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
};

export const sendEmail = async (to: string, subject: string, body: string): Promise<boolean> => {
  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'OrgScreen Hiring'}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: body,
      html: body.split('\n').map(line => `<p>${line}</p>`).join('')
    });
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    return false;
  }
};
