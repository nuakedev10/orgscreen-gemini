'use client';
import { useState, Suspense, useEffect } from 'react';
import { triggerScreening } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

function ScreenPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId') || '';
  const orgId = searchParams.get('orgId') || '';

  const [shortlistSize, setShortlistSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleScreen = async () => {
    setError('');
    if (!jobId || !orgId) {
      setError('Missing job or organization in the URL.');
      return;
    }
    setLoading(true);
    setStatus('Injecting organization context into Gemini...');

    const timers = [
      setTimeout(() => setStatus('Evaluating candidates against role requirements...'), 2000),
      setTimeout(() => setStatus('Scoring skills, experience, education, and culture fit...'), 5500),
      setTimeout(() => setStatus('Running fairness detection checks...'), 9000),
      setTimeout(() => setStatus('Generating shortlist and reasoning...'), 12000)
    ];

    try {
      await triggerScreening({ jobId, organizationId: orgId, shortlistSize });
      timers.forEach(clearTimeout);
      router.push(`/results?jobId=${jobId}`);
    } catch (err: any) {
      timers.forEach(clearTimeout);
      setError(err?.response?.data?.error || 'Screening failed. Make sure candidates are added for this job.');
      setLoading(false);
      setStatus('');
    }
  };

  // Missing URL params guard
  if (!jobId || !orgId) {
    return (
      <main style={{ minHeight: '100vh', padding: '40px 24px', maxWidth: '720px', margin: '0 auto' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', textDecoration: 'none', marginBottom: '28px' }}>
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        <div className="card-white" style={{ padding: '32px', textAlign: 'center' }}>
          <AlertCircle size={28} color="var(--danger)" style={{ margin: '0 auto 12px', display: 'block' }} />
          <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Missing job context</h1>
          <p style={{ color: 'var(--muted)', marginBottom: '20px' }}>
            Open this from a specific job — the URL needs <code>?jobId=...&amp;orgId=...</code>.
          </p>
          <Link href="/jobs/new"><button className="btn-primary">Post a new job</button></Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', padding: '40px 24px 80px', maxWidth: '680px', margin: '0 auto' }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', textDecoration: 'none', marginBottom: '28px' }}>
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
        <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--primary-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={22} color="var(--primary)" />
        </span>
        <div>
          <h1 style={{ fontSize: '30px', fontWeight: 700 }}>Run AI screening</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14.5px' }}>Gemini will evaluate candidates using your organization's hiring DNA.</p>
        </div>
      </div>

      <div className="adinkra-rule" style={{ marginTop: '28px' }}>Configuration</div>

      {error && (
        <div style={{ background: 'var(--danger-soft)', border: '1px solid rgba(184,52,31,0.25)', borderRadius: '12px', padding: '12px 14px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={16} color="var(--danger)" />
          <p style={{ color: 'var(--danger)', fontSize: '14px', fontWeight: 500 }}>{error}</p>
        </div>
      )}

      {!loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card-white">
            <h2 style={{ fontWeight: 700, fontSize: '17px', marginBottom: '4px' }}>Shortlist size</h2>
            <p style={{ color: 'var(--muted)', fontSize: '13.5px', marginBottom: '14px' }}>How many top candidates should the AI return?</p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {[5, 10, 15, 20].map(n => (
                <button
                  key={n}
                  onClick={() => setShortlistSize(n)}
                  className={shortlistSize === n ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '10px 18px', fontSize: '14px' }}
                >
                  Top {n}
                </button>
              ))}
            </div>
          </div>

          <div className="card-ink accent-kente">
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#F8B77A', marginBottom: '14px' }}>What happens when you run screening</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  'Your organization profile and values are injected into Gemini context',
                  'Every candidate is evaluated against the job requirements',
                  'Scores are computed across skills, experience, education, culture fit',
                  'Fairness flags surface candidates unfairly penalized for gaps or geography',
                  'A ranked shortlist is generated with plain-language reasoning per candidate'
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <span style={{ background: 'var(--primary)', color: '#FFF8EF', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0, marginTop: '1px', fontFamily: 'var(--font-display)' }}>{i + 1}</span>
                    <p style={{ color: 'rgba(251,248,241,0.75)', fontSize: '14px', lineHeight: 1.55 }}>{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button className="btn-primary" onClick={handleScreen} style={{ width: '100%', padding: '16px', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <Sparkles size={18} /> Run AI screening
          </button>
        </div>
      ) : (
        <div className="card-white" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Sparkles size={28} color="var(--primary)" />
            </div>
            <h2 style={{ fontWeight: 700, fontSize: '20px', marginBottom: '6px' }}>AI screening in progress</h2>
            <p style={{ color: 'var(--primary)', fontSize: '14px', fontWeight: 500 }}>{status}</p>
          </div>
          <div style={{ background: 'var(--bg-soft)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, var(--primary), var(--gold))',
              borderRadius: '999px',
              animation: 'pulse 2s ease-in-out infinite',
              width: '60%'
            }} />
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '16px' }}>This takes about 15 to 30 seconds depending on candidate count.</p>
        </div>
      )}
    </main>
  );
}

export default function ScreenPageWrapper() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', color: 'var(--muted)' }}>Loading...</div>}>
      <ScreenPage />
    </Suspense>
  );
}
