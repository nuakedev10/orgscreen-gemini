'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import {
  getScreeningResults,
  rerankCandidates,
  chatWithShortlist,
  downloadReport,
  updateCandidateStatus,
  previewDecisionEmails,
  confirmDecisionEmails
} from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import {
  ArrowLeft, AlertTriangle, ChevronDown, ChevronUp, Sliders, Sparkles,
  CheckCircle2, XCircle, Download, MessageSquare, Send, Mail, X
} from 'lucide-react';
import Link from 'next/link';

function getBadge(rec: string) {
  if (rec === 'Strong Hire') return <span className="badge-strong">Strong Hire</span>;
  if (rec === 'Hire') return <span className="badge-hire">Hire</span>;
  if (rec === 'Maybe') return <span className="badge-maybe">Maybe</span>;
  return <span className="badge-no">No Hire</span>;
}

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  hired: { bg: 'rgba(27,122,60,0.12)', color: '#1b7a3c', border: 'rgba(27,122,60,0.35)' },
  maybe: { bg: 'rgba(194,119,0,0.1)', color: '#c27700', border: 'rgba(194,119,0,0.35)' },
  rejected: { bg: 'rgba(184,52,31,0.1)', color: '#b8341f', border: 'rgba(184,52,31,0.3)' }
};

function CandidateCard({
  candidate,
  index,
  onStatusChange
}: {
  candidate: any;
  index: number;
  onStatusChange: (candidateId: string, status: string) => void;
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const [statusLoading, setStatusLoading] = useState(false);
  const currentStatus = candidate.decisionStatus || null;

  const radarData = [
    { dimension: 'Skills', score: candidate.dimensionScores?.skills || 0 },
    { dimension: 'Experience', score: candidate.dimensionScores?.experience || 0 },
    { dimension: 'Education', score: candidate.dimensionScores?.education || 0 },
    { dimension: 'Culture Fit', score: candidate.dimensionScores?.cultureFit || 0 }
  ];

  const handleStatus = async (status: string) => {
    if (!candidate.candidateId) return;
    setStatusLoading(true);
    try {
      await updateCandidateStatus(candidate.candidateId, status);
      onStatusChange(candidate.candidateId, status);
    } catch {
      // silent — the toggle will not update visually
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div className="card-white" style={{ marginBottom: '12px', padding: expanded ? '24px' : '16px 24px' }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--primary), var(--gold))',
            color: '#FFF8EF', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '16px', fontFamily: 'var(--font-display)', flexShrink: 0
          }}>
            {candidate.rank}
          </div>
          <div>
            <h3 style={{ fontWeight: 700, marginBottom: '4px', fontSize: '16px' }}>{candidate.fullName}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {getBadge(candidate.recommendation)}
              <span style={{ color: 'var(--muted)', fontSize: '13.5px' }}>
                Overall <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{candidate.overallScore}/100</strong>
              </span>
              {currentStatus && (
                <span style={{
                  fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px',
                  background: STATUS_COLORS[currentStatus]?.bg,
                  color: STATUS_COLORS[currentStatus]?.color,
                  border: `1px solid ${STATUS_COLORS[currentStatus]?.border}`
                }}>
                  {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {candidate.biasFlags?.length > 0 && (
            <span title="Fairness flag" style={{ display: 'inline-flex', width: '30px', height: '30px', borderRadius: '8px', background: 'var(--warning-soft)', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={15} color="var(--warning)" />
            </span>
          )}
          {expanded ? <ChevronUp size={18} color="var(--muted)" /> : <ChevronDown size={18} color="var(--muted)" />}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
          {/* Decision status row */}
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Decision</p>
            <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
              {(['hired', 'maybe', 'rejected'] as const).map(s => (
                <button
                  key={s}
                  disabled={statusLoading}
                  onClick={() => handleStatus(s)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: `1.5px solid ${currentStatus === s ? STATUS_COLORS[s].border : 'var(--border)'}`,
                    background: currentStatus === s ? STATUS_COLORS[s].bg : 'transparent',
                    color: currentStatus === s ? STATUS_COLORS[s].color : 'var(--muted)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: statusLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Radar */}
            <div>
              <h4 style={{ fontWeight: 600, marginBottom: '12px', color: 'var(--muted)', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Scoring breakdown</h4>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fill: 'var(--muted)', fontSize: 12, fontFamily: 'var(--font-body)' }} />
                  <Radar name="Score" dataKey="score" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.25} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--ink)' }} />
                </RadarChart>
              </ResponsiveContainer>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                {radarData.map(d => (
                  <div key={d.dimension} style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 12px' }}>
                    <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{d.dimension}</p>
                    <p style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>{d.score}/100</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--muted)', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Strengths</h4>
                {candidate.strengths?.map((s: string, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'flex-start' }}>
                    <CheckCircle2 size={14} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <p style={{ fontSize: '14px', color: 'var(--ink)', margin: 0, lineHeight: 1.5 }}>{s}</p>
                  </div>
                ))}
              </div>

              {candidate.gaps?.length > 0 && (
                <div>
                  <h4 style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--muted)', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Gaps</h4>
                  {candidate.gaps.map((g: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'flex-start' }}>
                      <XCircle size={14} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <p style={{ fontSize: '14px', color: 'var(--ink)', margin: 0, lineHeight: 1.5 }}>{g}</p>
                    </div>
                  ))}
                </div>
              )}

              {candidate.biasFlags?.length > 0 && (
                <div style={{ background: 'var(--warning-soft)', border: '1px solid rgba(196,131,21,0.3)', borderRadius: '12px', padding: '12px' }}>
                  <h4 style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--warning)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    <AlertTriangle size={13} /> Fairness flags
                  </h4>
                  {candidate.biasFlags.map((f: string, i: number) => (
                    <p key={i} style={{ fontSize: '13px', color: 'var(--ink-2)', margin: 0, lineHeight: 1.5 }}>{f}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '16px', background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
            <h4 style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--muted)', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.12em' }}>AI reasoning</h4>
            <p style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7, margin: 0 }}>{candidate.reasoning}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const STARTER_QUESTIONS = [
  'Who has the strongest cloud experience?',
  'Who would best mentor junior engineers?',
  'Which candidate is the strongest culture fit?',
  'Compare the top two candidates',
  'Who has international experience?'
];

function ChatPanel({ jobId, organizationId }: { jobId: string; organizationId: string }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [chatError, setChatError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || typing) return;
    setChatError('');
    const userMsg = { role: 'user' as const, content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    try {
      const history = messages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }));
      const res = await chatWithShortlist({ jobId, organizationId, message: text.trim(), conversationHistory: history });
      setMessages(prev => [...prev, { role: 'ai', content: res.data.response }]);
    } catch {
      setChatError('Failed to get a response. Please try again.');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="card-white" style={{ marginTop: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <MessageSquare size={18} color="var(--primary)" />
        <h2 style={{ fontWeight: 700, fontSize: '18px' }}>Ask AI About This Shortlist</h2>
      </div>

      {messages.length === 0 && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ color: 'var(--muted)', fontSize: '13.5px', marginBottom: '10px' }}>Try a starter question:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {STARTER_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                style={{
                  padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
                  background: 'var(--surface-soft)', border: '1px solid var(--border)',
                  color: 'var(--ink-2)', cursor: 'pointer'
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', padding: '4px 0' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '80%', padding: '12px 16px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: m.role === 'user' ? '#0066ff' : 'var(--surface-soft)',
                color: m.role === 'user' ? '#ffffff' : 'var(--ink)',
                fontSize: '14px', lineHeight: 1.6,
                border: m.role === 'ai' ? '1px solid var(--border)' : 'none'
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {typing && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '12px 16px', borderRadius: '16px 16px 16px 4px', background: 'var(--surface-soft)', border: '1px solid var(--border)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--muted)', animation: 'pulse 1.2s infinite', animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {chatError && (
        <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '10px' }}>{chatError}</p>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          className="input"
          style={{ flex: 1 }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
          placeholder='e.g. Who has the strongest cloud experience?'
          disabled={typing}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || typing}
          style={{
            padding: '10px 16px', borderRadius: '10px', border: 'none',
            background: input.trim() && !typing ? '#0066ff' : 'var(--surface-soft)',
            color: input.trim() && !typing ? '#ffffff' : 'var(--muted)',
            cursor: input.trim() && !typing ? 'pointer' : 'not-allowed',
            display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '14px'
          }}
        >
          <Send size={15} />
        </button>
      </div>

      {messages.length > 0 && (
        <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {STARTER_QUESTIONS.slice(0, 3).map(q => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              disabled={typing}
              style={{
                padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: 500,
                background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--muted)', cursor: typing ? 'not-allowed' : 'pointer'
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EmailModal({
  jobId, organizationId, onClose
}: {
  jobId: string;
  organizationId: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<'loading' | 'preview' | 'sending' | 'done' | 'error'>('loading');
  const [previews, setPreviews] = useState<any>({});
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [sent, setSent] = useState(0);
  const [failed, setFailed] = useState(0);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    previewDecisionEmails({ jobId, organizationId })
      .then(res => {
        setPreviews(res.data.previews);
        setTotalCandidates(res.data.totalCandidates);
        setStep('preview');
      })
      .catch(err => {
        setErrMsg(err?.response?.data?.error || 'Failed to generate email previews');
        setStep('error');
      });
  }, [jobId, organizationId]);

  const handleConfirm = async () => {
    setStep('sending');
    try {
      const res = await confirmDecisionEmails({ jobId, organizationId });
      setSent(res.data.sent);
      setFailed(res.data.failed);
      setStep('done');
    } catch (err: any) {
      setErrMsg(err?.response?.data?.error || 'Failed to send emails');
      setStep('error');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,12,10,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
      <div className="card-white" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Mail size={20} color="var(--primary)" />
          <h2 style={{ fontWeight: 700, fontSize: '20px' }}>Decision Email Preview</h2>
        </div>

        {step === 'loading' && (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px 0' }}>Generating personalized email previews...</p>
        )}

        {step === 'sending' && (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px 0' }}>Sending emails to {totalCandidates} candidates...</p>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <CheckCircle2 size={48} color="var(--success)" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontWeight: 700, fontSize: '20px', marginBottom: '8px' }}>{sent} emails sent successfully</h3>
            {failed > 0 && <p style={{ color: 'var(--danger)' }}>{failed} failed to send</p>}
            <button onClick={onClose} className="btn-primary" style={{ marginTop: '16px' }}>Close</button>
          </div>
        )}

        {step === 'error' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ color: 'var(--danger)', marginBottom: '16px' }}>{errMsg}</p>
            <button onClick={onClose} className="btn-secondary">Close</button>
          </div>
        )}

        {step === 'preview' && (
          <>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '20px' }}>
              Review sample emails below. Clicking &quot;Confirm and Send All&quot; will dispatch personalized emails to all {totalCandidates} candidate{totalCandidates !== 1 ? 's' : ''} with a decision.
            </p>

            {(['hired', 'maybe', 'rejected'] as const).map(status => {
              if (!previews[status]) return null;
              const p = previews[status];
              const colors = STATUS_COLORS[status];
              return (
                <div key={status} style={{ marginBottom: '20px', border: `1.5px solid ${colors.border}`, borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ background: colors.bg, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: colors.color, textTransform: 'capitalize', fontSize: '14px' }}>
                      {status} ({p.count} candidate{p.count !== 1 ? 's' : ''})
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Sample: {p.candidateName}</span>
                  </div>
                  <div style={{ padding: '16px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px', fontWeight: 600 }}>Subject</p>
                    <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>{p.subject}</p>
                    <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px', fontWeight: 600 }}>Body</p>
                    <div style={{ fontSize: '13.5px', color: 'var(--ink)', lineHeight: 1.7, background: 'var(--surface-soft)', borderRadius: '8px', padding: '12px', whiteSpace: 'pre-line' }}>
                      {p.body}
                    </div>
                  </div>
                </div>
              );
            })}

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleConfirm} className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Mail size={15} /> Confirm and Send All
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ResultsPage() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId') || '';
  const orgId = searchParams.get('orgId') || '';

  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showWeights, setShowWeights] = useState(false);
  const [weights, setWeights] = useState({ skills: 40, experience: 30, education: 15, cultureFit: 15 });
  const [reranking, setReranking] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [decisionStatuses, setDecisionStatuses] = useState<Record<string, string>>({});
  const [downloading, setDownloading] = useState(false);
  const [downloadToast, setDownloadToast] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [organizationId, setOrganizationId] = useState('');

  useEffect(() => {
    if (!jobId) return;
    getScreeningResults(jobId)
      .then(res => {
        const r = res.data.results;
        setResults(r);
        setCandidates(r.candidates);
        setOrganizationId(orgId || r.organizationId);

        // Seed existing decision statuses if any
        const statuses: Record<string, string> = {};
        r.candidates.forEach((c: any) => {
          if (c.decisionStatus) statuses[c.candidateId] = c.decisionStatus;
        });
        setDecisionStatuses(statuses);
      })
      .catch(() => setResults(null))
      .finally(() => setLoading(false));
  }, [jobId, orgId]);

  const handleRerank = async () => {
    if (!results) return;
    setReranking(true);
    try {
      const res = await rerankCandidates({ resultId: results._id, weights });
      setCandidates(res.data.candidates);
    } catch {
      // silent
    } finally {
      setReranking(false);
    }
  };

  const handleStatusChange = (candidateId: string, status: string) => {
    setDecisionStatuses(prev => ({ ...prev, [candidateId]: status }));
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadReport(jobId);
      setDownloadToast(true);
      setTimeout(() => setDownloadToast(false), 3000);
    } catch {
      // silent — browser error is visible
    } finally {
      setDownloading(false);
    }
  };

  const hasDecisions = Object.keys(decisionStatuses).length > 0;
  const total = Object.values(weights).reduce((a, b) => a + b, 0);

  const candidatesWithStatuses = candidates.map(c => ({
    ...c,
    decisionStatus: decisionStatuses[c.candidateId] || c.decisionStatus || null
  }));

  if (loading) return (
    <main style={{ minHeight: '100vh', padding: '40px 24px', maxWidth: '960px', margin: '0 auto' }}>
      <p style={{ color: 'var(--muted)' }}>Loading results...</p>
    </main>
  );

  if (!results) return (
    <main style={{ minHeight: '100vh', padding: '40px 24px', maxWidth: '960px', margin: '0 auto' }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', textDecoration: 'none', marginBottom: '28px' }}>
        <ArrowLeft size={16} /> Back
      </Link>
      <div className="card-white" style={{ textAlign: 'center', padding: '48px' }}>
        <p style={{ color: 'var(--muted)', marginBottom: '16px' }}>No screening results found for this job yet.</p>
        <Link href="/screen"><button className="btn-primary">Run screening</button></Link>
      </div>
    </main>
  );

  return (
    <main style={{ minHeight: '100vh', padding: '40px 24px 80px', maxWidth: '960px', margin: '0 auto' }}>
      {showEmailModal && (
        <EmailModal
          jobId={jobId}
          organizationId={organizationId}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      {downloadToast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: 'var(--ink)', color: '#fff', padding: '12px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, zIndex: 999, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} color="#4ade80" /> Report downloaded successfully
        </div>
      )}

      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', textDecoration: 'none', marginBottom: '28px' }}>
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Sparkles size={18} color="var(--primary)" />
            <span className="pill pill-brand">Screening complete</span>
          </div>
          <h1 style={{ fontSize: '30px', fontWeight: 700 }}>Ranked shortlist</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14.5px' }}>
            Showing top {candidates.length} · {results.totalCandidatesScreened || candidates.length} total screened · model {results.aiModel || 'gemini-2.5-flash'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {hasDecisions && (
            <button
              onClick={() => setShowEmailModal(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '9px 16px', borderRadius: '10px', border: '1.5px solid #0066ff',
                background: '#0066ff', color: '#ffffff', fontWeight: 600, fontSize: '14px', cursor: 'pointer'
              }}
            >
              <Mail size={15} /> Send Decision Emails
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Download size={15} /> {downloading ? 'Downloading...' : 'Download Report'}
          </button>
          <button onClick={() => setShowWeights(!showWeights)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={15} /> Adjust weights
          </button>
        </div>
      </div>

      <div className="adinkra-rule" style={{ marginTop: '24px' }}>Candidates</div>

      {showWeights && (
        <div className="card-white" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ fontWeight: 700, fontSize: '17px' }}>Adjust scoring weights</h2>
            <span className={total === 100 ? 'pill pill-indigo' : 'pill'} style={total !== 100 ? { background: 'var(--danger-soft)', color: 'var(--danger)', borderColor: 'rgba(184,52,31,0.25)' } : {}}>
              Total {total}%
            </span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '13.5px', marginTop: '4px', marginBottom: '14px' }}>Reshuffle the list instantly — no second Gemini call.</p>
          {(['skills', 'experience', 'education', 'cultureFit'] as const).map(key => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <label style={{ width: '120px', fontSize: '14px', fontWeight: 500, textTransform: 'capitalize' }}>{key === 'cultureFit' ? 'Culture Fit' : key}</label>
              <input type="range" min={0} max={100} value={weights[key]} onChange={e => setWeights({ ...weights, [key]: Number(e.target.value) })} style={{ flex: 1, accentColor: 'var(--primary)' }} />
              <span style={{ width: '48px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>{weights[key]}%</span>
            </div>
          ))}
          <button className="btn-primary" onClick={handleRerank} disabled={reranking || total !== 100} style={{ marginTop: '8px' }}>
            {reranking ? 'Re-ranking...' : 'Apply and re-rank'}
          </button>
          {total !== 100 && <p style={{ color: 'var(--danger)', fontSize: '13px', marginTop: '8px' }}>Weights must total exactly 100%.</p>}
        </div>
      )}

      {results.screeningNotes && (
        <div className="card-ink accent-kente" style={{ marginBottom: '20px' }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ color: '#F8B77A', fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '6px' }}>AI screening notes</p>
            <p style={{ color: 'rgba(251,248,241,0.88)', fontSize: '14.5px', lineHeight: 1.6, margin: 0 }}>{results.screeningNotes}</p>
          </div>
        </div>
      )}

      {candidatesWithStatuses.map((candidate: any, i: number) => (
        <CandidateCard
          key={candidate.candidateId || i}
          candidate={candidate}
          index={i}
          onStatusChange={handleStatusChange}
        />
      ))}

      <ChatPanel jobId={jobId} organizationId={organizationId} />
    </main>
  );
}

export default function ResultsPageWrapper() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', color: 'var(--muted)' }}>Loading...</div>}>
      <ResultsPage />
    </Suspense>
  );
}
