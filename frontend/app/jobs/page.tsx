'use client';
import { useState, useEffect, Suspense } from 'react';
import { createJob, getOrganizations } from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Plus, X } from 'lucide-react';
import Link from 'next/link';

function JobForm() {
  const searchParams = useSearchParams();
  const preselectedOrg = searchParams.get('orgId') || '';

  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
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
    getOrganizations().then(res => setOrgs(res.data.organizations));
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

  const handleSubmit = async () => {
    if (!form.organizationId || !form.title) {
      alert('Organization and job title are required');
      return;
    }
    setLoading(true);
    try {
      const res = await createJob({
        ...form,
        requiredSkills: form.requiredSkills.filter(s => s.trim()),
        niceToHaveSkills: form.niceToHaveSkills.filter(s => s.trim()),
        responsibilities: form.responsibilities.filter(r => r.trim())
      });

      const jobId = res.data.job._id;
      const orgId = form.organizationId;
      window.location.replace(`/candidates?jobId=${jobId}&orgId=${orgId}`);
    } catch (error: any) {
      alert(`Failed: ${error?.response?.data?.error || error.message}`);
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', padding: '40px 24px', maxWidth: '720px', margin: '0 auto' }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', textDecoration: 'none', marginBottom: '32px' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px', color: '#0a0a0f' }}>Post a Job</h1>
      <p style={{ color: '#6b7280', marginBottom: '32px' }}>Define the role. The AI will use this to screen every candidate.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="card-white">
          <h2 style={{ fontWeight: '700', marginBottom: '16px' }}>Role Details</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '14px', color: '#6b7280', display: 'block', marginBottom: '6px' }}>Organization *</label>
              <select className="input" value={form.organizationId} onChange={e => setForm({ ...form, organizationId: e.target.value })}>
                <option value="">Select organization</option>
                {orgs.map(org => <option key={org._id} value={org._id}>{org.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '14px', color: '#6b7280', display: 'block', marginBottom: '6px' }}>Job Title *</label>
              <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Senior Data Engineer" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '14px', color: '#6b7280', display: 'block', marginBottom: '6px' }}>Department</label>
                <input className="input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="e.g. Engineering" />
              </div>
              <div>
                <label style={{ fontSize: '14px', color: '#6b7280', display: 'block', marginBottom: '6px' }}>Experience Level</label>
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
              <label style={{ fontSize: '14px', color: '#6b7280', display: 'block', marginBottom: '6px' }}>Education Requirement</label>
              <input className="input" value={form.educationRequirement} onChange={e => setForm({ ...form, educationRequirement: e.target.value })} placeholder="e.g. BSc in Computer Science or related field" />
            </div>
          </div>
        </div>

        <div className="card-white">
          <h2 style={{ fontWeight: '700', marginBottom: '16px' }}>Required Skills</h2>
          {form.requiredSkills.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input className="input" value={s} onChange={e => updateList('requiredSkills', i, e.target.value)} placeholder={`Skill ${i + 1}`} />
              {form.requiredSkills.length > 1 && <button onClick={() => removeItem('requiredSkills', i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}><X size={16} /></button>}
            </div>
          ))}
          <button onClick={() => addItem('requiredSkills')} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0066ff', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}><Plus size={14} /> Add Skill</button>
        </div>

        <div className="card-white">
          <h2 style={{ fontWeight: '700', marginBottom: '16px' }}>Nice-to-Have Skills</h2>
          {form.niceToHaveSkills.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input className="input" value={s} onChange={e => updateList('niceToHaveSkills', i, e.target.value)} placeholder={`Skill ${i + 1}`} />
              {form.niceToHaveSkills.length > 1 && <button onClick={() => removeItem('niceToHaveSkills', i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}><X size={16} /></button>}
            </div>
          ))}
          <button onClick={() => addItem('niceToHaveSkills')} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0066ff', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}><Plus size={14} /> Add Skill</button>
        </div>

        <div className="card-white">
          <h2 style={{ fontWeight: '700', marginBottom: '16px' }}>Key Responsibilities</h2>
          {form.responsibilities.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input className="input" value={r} onChange={e => updateList('responsibilities', i, e.target.value)} placeholder={`Responsibility ${i + 1}`} />
              {form.responsibilities.length > 1 && <button onClick={() => removeItem('responsibilities', i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}><X size={16} /></button>}
            </div>
          ))}
          <button onClick={() => addItem('responsibilities')} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0066ff', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}><Plus size={14} /> Add Responsibility</button>
        </div>

        <div className="card-white">
          <h2 style={{ fontWeight: '700', marginBottom: '8px' }}>Additional Notes</h2>
          <textarea className="input" rows={3} value={form.additionalNotes} onChange={e => setForm({ ...form, additionalNotes: e.target.value })} placeholder="Any extra context for the AI screener..." />
        </div>

        <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '14px', fontSize: '16px' }}>
          {loading ? 'Creating...' : 'Create Job and Add Candidates →'}
        </button>
      </div>
    </main>
  );
}

export default function JobNewPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', color: '#6b7280' }}>Loading...</div>}>
      <JobForm />
    </Suspense>
  );
}