'use client';
import { useState } from 'react';
import { createOrganization } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, X, Building2, Sparkles, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    industry: '',
    knowledgeBase: '',
    cultureValues: [''],
    idealCandidatePersonas: [''],
    hiringPriorities: { skills: 40, experience: 30, education: 15, cultureFit: 15 }
  });

  const updateList = (field: 'cultureValues' | 'idealCandidatePersonas', index: number, value: string) => {
    const updated = [...form[field]];
    updated[index] = value;
    setForm({ ...form, [field]: updated });
  };

  const addItem = (field: 'cultureValues' | 'idealCandidatePersonas') => {
    setForm({ ...form, [field]: [...form[field], ''] });
  };

  const removeItem = (field: 'cultureValues' | 'idealCandidatePersonas', index: number) => {
    const updated = form[field].filter((_, i) => i !== index);
    setForm({ ...form, [field]: updated });
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.name || !form.industry) {
      setError('Name and industry are required.');
      return;
    }
    setLoading(true);
    try {
      await createOrganization({
        ...form,
        cultureValues: form.cultureValues.filter(v => v.trim()),
        idealCandidatePersonas: form.idealCandidatePersonas.filter(v => v.trim())
      });
      router.push('/');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create organization.');
      setLoading(false);
    }
  };

  const total = Object.values(form.hiringPriorities).reduce((a, b) => a + b, 0);

  return (
    <main style={{ minHeight: '100vh', padding: '40px 24px 80px', maxWidth: '780px', margin: '0 auto' }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', textDecoration: 'none', marginBottom: '28px' }}>
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
        <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--primary-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <Building2 size={22} color="var(--primary)" />
        </span>
        <div>
          <h1 style={{ fontSize: '30px', fontWeight: 700 }}>Teach the AI your hiring DNA</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14.5px' }}>This profile goes into every Gemini prompt as context.</p>
        </div>
      </div>

      <div className="adinkra-rule" style={{ marginTop: '28px' }}>Organization profile</div>

      {error && (
        <div style={{
          background: 'var(--danger-soft)',
          border: '1px solid rgba(184,52,31,0.25)',
          borderRadius: '12px',
          padding: '12px 14px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertCircle size={16} color="var(--danger)" />
          <p style={{ color: 'var(--danger)', fontSize: '14px', fontWeight: 500 }}>{error}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        <div className="card-white">
          <h2 style={{ fontWeight: 700, marginBottom: '14px', fontSize: '17px' }}>Basic information</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>Organization name *</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. TechCorp Rwanda" />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>Industry *</label>
              <input className="input" value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="e.g. Fintech, Healthtech, Agritech" />
            </div>
          </div>
        </div>

        <div className="card-white">
          <h2 style={{ fontWeight: 700, marginBottom: '4px', fontSize: '17px' }}>Culture values</h2>
          <p style={{ color: 'var(--muted)', fontSize: '13.5px', marginBottom: '14px' }}>What principles define how you operate? The AI uses these to score culture fit.</p>
          {form.cultureValues.map((val, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input className="input" value={val} onChange={e => updateList('cultureValues', i, e.target.value)} placeholder={`Value ${i + 1}  (e.g. "Bias for action")`} />
              {form.cultureValues.length > 1 && (
                <button type="button" onClick={() => removeItem('cultureValues', i)} className="icon-btn" aria-label="Remove value">
                  <X size={15} />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => addItem('cultureValues')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>
            <Plus size={14} /> Add value
          </button>
        </div>

        <div className="card-white">
          <h2 style={{ fontWeight: 700, marginBottom: '4px', fontSize: '17px' }}>Ideal candidate personas</h2>
          <p style={{ color: 'var(--muted)', fontSize: '13.5px', marginBottom: '14px' }}>Describe the type of people who thrive here. Be specific — vague personas produce generic screening.</p>
          {form.idealCandidatePersonas.map((val, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input className="input" value={val} onChange={e => updateList('idealCandidatePersonas', i, e.target.value)} placeholder={`Persona ${i + 1}  (e.g. "Self-taught builder who shipped at an African startup")`} />
              {form.idealCandidatePersonas.length > 1 && (
                <button type="button" onClick={() => removeItem('idealCandidatePersonas', i)} className="icon-btn" aria-label="Remove persona">
                  <X size={15} />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => addItem('idealCandidatePersonas')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>
            <Plus size={14} /> Add persona
          </button>
        </div>

        <div className="card-white">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ fontWeight: 700, fontSize: '17px' }}>Scoring weights</h2>
            <span className={total === 100 ? 'pill pill-indigo' : 'pill'} style={total !== 100 ? { background: 'var(--danger-soft)', color: 'var(--danger)', borderColor: 'rgba(184,52,31,0.25)' } : {}}>
              {total}% of 100%
            </span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '13.5px', marginTop: '4px', marginBottom: '14px' }}>
            How much should each dimension matter? Recruiters can override these at review time.
          </p>
          {(['skills', 'experience', 'education', 'cultureFit'] as const).map(key => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <label style={{ width: '120px', fontSize: '14px', fontWeight: 500, textTransform: 'capitalize' }}>{key === 'cultureFit' ? 'Culture Fit' : key}</label>
              <input
                type="range"
                min={0}
                max={100}
                value={form.hiringPriorities[key]}
                onChange={e => setForm({ ...form, hiringPriorities: { ...form.hiringPriorities, [key]: Number(e.target.value) } })}
                style={{ flex: 1, accentColor: 'var(--primary)' }}
              />
              <span style={{ width: '48px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>{form.hiringPriorities[key]}%</span>
            </div>
          ))}
          {total !== 100 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <p style={{ color: 'var(--danger)', fontSize: '13px' }}>Weights must total exactly 100%.</p>
              <button
                type="button"
                onClick={() => setForm({ ...form, hiringPriorities: { skills: 40, experience: 30, education: 15, cultureFit: 15 } })}
                style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
              >
                Reset to default
              </button>
            </div>
          )}
        </div>

        <div className="card-white">
          <h2 style={{ fontWeight: 700, marginBottom: '4px', fontSize: '17px' }}>Additional knowledge</h2>
          <p style={{ color: 'var(--muted)', fontSize: '13.5px', marginBottom: '14px' }}>
            Anything else the AI should know — hiring philosophy, past success stories, team norms. This is your RAG payload.
          </p>
          <textarea
            className="input"
            rows={5}
            value={form.knowledgeBase}
            onChange={e => setForm({ ...form, knowledgeBase: e.target.value })}
            placeholder="e.g. We prefer candidates who've shipped real products in resource-constrained environments. We favor builders who mentor juniors..."
          />
        </div>

        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={loading || total !== 100}
          style={{ width: '100%', padding: '15px', fontSize: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <Sparkles size={16} />
          {loading ? 'Creating organization...' : 'Create organization'}
        </button>
      </div>
    </main>
  );
}
