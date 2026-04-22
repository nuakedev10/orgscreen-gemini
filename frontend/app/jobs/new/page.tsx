'use client';
import { useState, useEffect, Suspense } from 'react';
import { createJob, getOrganizations, generateJobDescription } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Plus, X, AlertCircle, Briefcase, Sparkles, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

function JobForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedOrg = searchParams.get('orgId') || '';

  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    organizationId: preselectedOrg,
    title: '',
    department: '',
    experienceLevel: '',
    educationRequirement: '',
    additionalNotes: '',
    requiredSkills: [''],
    niceToHaveSkills: [''],
    responsibilities: ['']
  });

  useEffect(() => {
    getOrganizations()
      .then(res => setOrgs(res.data.organizations))
      .catch(() => setError('Failed to load organizations. Is the backend running on port 5001?'));
  }, []);

  const updateList = (field: 'requiredSkills' | 'niceToHaveSkills' | 'responsibilities', index: number, value: string) => {
    const updated = [...form[field]];
    updated[index] = value;
    setForm({ ...form, [field]: updated });
  };

  const addItem = (field: 'requiredSkills' | 'niceToHaveSkills' | 'responsibilities') => {
    setForm({ ...form, [field]: [...form[field], ''] });
  };

  const removeItem = (field: 'requiredSkills' | 'niceToHaveSkills' | 'responsibilities', index: number) => {
    setForm({ ...form, [field]: form[field].filter((_, i) => i !== index) });
  };

  const handleGenerate = async () => {
    setError('');
    setGenerateSuccess(false);

    if (!form.organizationId) { setError('Please select an organization first'); return; }
    if (!form.title.trim()) { setError('Please enter a job title first'); return; }

    setGenerating(true);
    try {
      const res = await generateJobDescription({ jobTitle: form.title, organizationId: form.organizationId });
      const jd = res.data.jobDescription;

      setForm(prev => ({
        ...prev,
        department: jd.department || prev.department,
        experienceLevel: jd.experienceLevel || prev.experienceLevel,
        educationRequirement: jd.educationRequirement || prev.educationRequirement,
        requiredSkills: jd.requiredSkills?.length > 0 ? jd.requiredSkills : prev.requiredSkills,
        niceToHaveSkills: jd.niceToHaveSkills?.length > 0 ? jd.niceToHaveSkills : prev.niceToHaveSkills,
        responsibilities: jd.responsibilities?.length > 0 ? jd.responsibilities : prev.responsibilities,
        additionalNotes: jd.additionalNotes || prev.additionalNotes
      }));

      setGenerateSuccess(true);
      setTimeout(() => setGenerateSuccess(false), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to generate job description. Try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!form.organizationId) { setError('Please select an organization'); return; }
    if (!form.title.trim()) { setError('Job title is required'); return; }

    setLoading(true);

    try {
      const res = await createJob({
        ...form,
        requiredSkills: form.requiredSkills.filter(s => s.trim()),
        niceToHaveSkills: form.niceToHaveSkills.filter(s => s.trim()),
        responsibilities: form.responsibilities.filter(r => r.trim())
      });

      const jobId = res?.data?.job?._id;
      const orgId = form.organizationId;

      if (!jobId) {
        setError('Job was created but the server did not return a job id. Check the Network tab.');
        setLoading(false);
        return;
      }

      router.push(`/candidates?jobId=${jobId}&orgId=${orgId}`);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to create job');
      setLoading(false);
    }
  };

  const canGenerate = !!form.organizationId && !!form.title.trim();

  return (
    <main style={{ minHeight: '100vh', padding: '40px 24px 80px', maxWidth: '780px', margin: '0 auto' }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', textDecoration: 'none', marginBottom: '28px' }}>
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
        <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--primary-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <Briefcase size={22} color="var(--primary)" />
        </span>
        <div>
          <h1 style={{ fontSize: '30px', fontWeight: 700 }}>Post a job</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14.5px' }}>The AI will use this spec plus your org DNA to score every candidate.</p>
        </div>
      </div>

      <div className="adinkra-rule" style={{ marginTop: '28px' }}>Role details</div>

      {error && (
        <div style={{ background: 'var(--danger-soft)', border: '1px solid rgba(184,52,31,0.25)', borderRadius: '12px', padding: '12px 14px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={16} color="var(--danger)" />
          <p style={{ color: 'var(--danger)', fontSize: '14px', fontWeight: 500 }}>{error}</p>
        </div>
      )}

      {generateSuccess && (
        <div style={{ background: 'rgba(27,122,60,0.08)', border: '1px solid rgba(27,122,60,0.3)', borderRadius: '12px', padding: '12px 14px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={16} color="var(--success)" />
          <p style={{ color: 'var(--success)', fontSize: '14px', fontWeight: 500 }}>Job description generated from your organization profile</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="card-white">
          <h2 style={{ fontWeight: 700, marginBottom: '14px', fontSize: '17px' }}>Role details</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>Organization *</label>
              <select className="input" value={form.organizationId} onChange={e => setForm({ ...form, organizationId: e.target.value })}>
                <option value="">Select organization</option>
                {orgs.map(org => <option key={org._id} value={org._id}>{org.name}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>Job title *</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <input
                  className="input"
                  style={{ flex: 1 }}
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Senior Data Engineer"
                />
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!canGenerate || generating}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 14px',
                    background: canGenerate && !generating ? '#0066ff' : 'var(--surface-soft)',
                    color: canGenerate && !generating ? '#ffffff' : 'var(--muted)',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: canGenerate && !generating ? 'pointer' : 'not-allowed',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'background 0.15s'
                  }}
                >
                  <Sparkles size={13} />
                  {generating ? 'Generating...' : 'Generate with AI ✦'}
                </button>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>
                Select an org and enter a title, then click Generate to auto-fill all fields from your org profile.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>Department</label>
                <input className="input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="e.g. Engineering" />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>Experience level</label>
                <select className="input" value={form.experienceLevel} onChange={e => setForm({ ...form, experienceLevel: e.target.value })}>
                  <option value="">Select level</option>
                  <option>Junior (0-2 years)</option>
                  <option>Mid-level (2-5 years)</option>
                  <option>Senior (5+ years)</option>
                  <option>Lead / Principal</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>Education requirement</label>
              <input className="input" value={form.educationRequirement} onChange={e => setForm({ ...form, educationRequirement: e.target.value })} placeholder="e.g. BSc in Computer Science or equivalent experience" />
            </div>
          </div>
        </div>

        <div className="card-white">
          <h2 style={{ fontWeight: 700, marginBottom: '12px', fontSize: '17px' }}>Required skills</h2>
          {form.requiredSkills.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input className="input" value={s} onChange={e => updateList('requiredSkills', i, e.target.value)} placeholder={`Skill ${i + 1}`} />
              {form.requiredSkills.length > 1 && (
                <button type="button" onClick={() => removeItem('requiredSkills', i)} className="icon-btn" aria-label="Remove skill">
                  <X size={15} />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => addItem('requiredSkills')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
            <Plus size={14} /> Add skill
          </button>
        </div>

        <div className="card-white">
          <h2 style={{ fontWeight: 700, marginBottom: '12px', fontSize: '17px' }}>Nice-to-have skills</h2>
          {form.niceToHaveSkills.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input className="input" value={s} onChange={e => updateList('niceToHaveSkills', i, e.target.value)} placeholder={`Skill ${i + 1}`} />
              {form.niceToHaveSkills.length > 1 && (
                <button type="button" onClick={() => removeItem('niceToHaveSkills', i)} className="icon-btn" aria-label="Remove skill">
                  <X size={15} />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => addItem('niceToHaveSkills')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
            <Plus size={14} /> Add skill
          </button>
        </div>

        <div className="card-white">
          <h2 style={{ fontWeight: 700, marginBottom: '12px', fontSize: '17px' }}>Key responsibilities</h2>
          {form.responsibilities.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input className="input" value={r} onChange={e => updateList('responsibilities', i, e.target.value)} placeholder={`Responsibility ${i + 1}`} />
              {form.responsibilities.length > 1 && (
                <button type="button" onClick={() => removeItem('responsibilities', i)} className="icon-btn" aria-label="Remove responsibility">
                  <X size={15} />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => addItem('responsibilities')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
            <Plus size={14} /> Add responsibility
          </button>
        </div>

        <div className="card-white">
          <h2 style={{ fontWeight: 700, marginBottom: '8px', fontSize: '17px' }}>Additional notes</h2>
          <textarea className="input" rows={3} value={form.additionalNotes} onChange={e => setForm({ ...form, additionalNotes: e.target.value })} placeholder="Any extra context for the AI screener..." />
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={handleSubmit}
          disabled={loading}
          style={{ width: '100%', padding: '15px', fontSize: '16px' }}
        >
          {loading ? 'Creating job...' : 'Create job and add candidates →'}
        </button>
      </div>
    </main>
  );
}

export default function JobNewPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', color: 'var(--muted)' }}>Loading...</div>}>
      <JobForm />
    </Suspense>
  );
}
