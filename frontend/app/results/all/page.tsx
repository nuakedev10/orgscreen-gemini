'use client';
import { useState, useEffect } from 'react';
import { getOrganizations, getJobs } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Users, Briefcase } from 'lucide-react';

export default function AllResultsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getOrganizations().then(res => setOrgs(res.data.organizations));
  }, []);

  useEffect(() => {
    if (!selectedOrg) {
      setJobs([]);
      return;
    }
    setLoading(true);
    getJobs(selectedOrg)
      .then(res => setJobs(res.data.jobs))
      .finally(() => setLoading(false));
  }, [selectedOrg]);

  return (
    <main style={{ minHeight: '100vh', padding: '40px 24px 80px', maxWidth: '780px', margin: '0 auto' }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', textDecoration: 'none', marginBottom: '28px' }}>
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
        <span style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--primary-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users size={22} color="var(--primary)" />
        </span>
        <div>
          <h1 style={{ fontSize: '30px', fontWeight: 700 }}>Screening results</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14.5px' }}>Select an organization to list its jobs and shortlists.</p>
        </div>
      </div>

      <div className="adinkra-rule" style={{ marginTop: '28px' }}>Pick a job</div>

      <div className="card-white" style={{ marginBottom: '20px' }}>
        <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>Organization</label>
        <select className="input" value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)}>
          <option value="">Select organization</option>
          {orgs.map(org => <option key={org._id} value={org._id}>{org.name}</option>)}
        </select>
      </div>

      {loading && <p style={{ color: 'var(--muted)' }}>Loading jobs...</p>}

      {jobs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {jobs.map(job => (
            <Link key={job._id} href={`/results?jobId=${job._id}`} style={{ textDecoration: 'none' }}>
              <div className="card-white" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--surface-soft)', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Briefcase size={16} color="var(--ink-2)" />
                  </span>
                  <div>
                    <h3 style={{ fontWeight: 700, marginBottom: '2px', fontSize: '15.5px' }}>{job.title}</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '13.5px' }}>
                      {job.department || 'No department'} · <span className={`pill pill-${job.status === 'closed' ? 'indigo' : 'gold'}`} style={{ fontSize: '11px', padding: '2px 8px' }}>{job.status}</span>
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} color="var(--muted)" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {selectedOrg && !loading && jobs.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '48px', border: '2px dashed var(--border)', background: 'transparent' }}>
          <p style={{ color: 'var(--muted)' }}>No jobs found for this organization yet.</p>
        </div>
      )}
    </main>
  );
}
