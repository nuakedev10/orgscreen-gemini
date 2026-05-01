'use client';
import { useState, useEffect, Suspense, useRef } from 'react';
import { addCandidates, uploadMultiplePDFs, uploadCSV, getCandidates, getJob } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  X,
  Upload,
  Users,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  FileText,
  FileUp,
  FileCheck2,
  FileWarning,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

type ManualCandidate = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  skills: string;
  yearsOfExperience: string;
  degree: string;
  field: string;
  institution: string;
  resumeText: string;
};

type UploadResult = {
  filename: string;
  status: 'parsed' | 'failed';
  candidate?: any;
  reason?: string;
};

const emptyCandidate = (): ManualCandidate => ({
  fullName: '',
  email: '',
  phone: '',
  location: '',
  skills: '',
  yearsOfExperience: '',
  degree: '',
  field: '',
  institution: '',
  resumeText: ''
});

function CandidatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId') || '';
  const orgId = searchParams.get('orgId') || '';

  const [job, setJob] = useState<any>(null);
  const [existing, setExisting] = useState<any[]>([]);
  const [rows, setRows] = useState<ManualCandidate[]>([emptyCandidate()]);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [mode, setMode] = useState<'resumes' | 'manual' | 'csv'>('resumes');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const dropRef = useRef<HTMLLabelElement>(null);

  useEffect(() => {
    if (!jobId || !orgId) return;

    getJob(jobId)
      .then(res => setJob(res.data.job))
      .catch(() => {});

    getCandidates(jobId)
      .then(res => setExisting(res.data.candidates || []))
      .catch(() => {});
  }, [jobId, orgId]);

  const updateRow = (index: number, field: keyof ManualCandidate, value: string) => {
    const next = [...rows];
    next[index] = { ...next[index], [field]: value };
    setRows(next);
  };

  const addRow = () => setRows([...rows, emptyCandidate()]);
  const removeRow = (index: number) => {
    if (rows.length === 1) {
      setRows([emptyCandidate()]);
      return;
    }
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleSaveManual = async () => {
    setError('');
    setSuccess('');

    const cleaned = rows
      .filter(r => r.fullName.trim() && r.email.trim())
      .map(r => ({
        fullName: r.fullName.trim(),
        email: r.email.trim(),
        phone: r.phone.trim() || undefined,
        location: r.location.trim() || undefined,
        skills: r.skills.split(',').map(s => s.trim()).filter(Boolean),
        yearsOfExperience: r.yearsOfExperience ? Number(r.yearsOfExperience) : 0,
        education: {
          degree: r.degree.trim(),
          field: r.field.trim(),
          institution: r.institution.trim()
        },
        workHistory: [],
        resumeText: r.resumeText.trim() || undefined
      }));

    if (cleaned.length === 0) {
      setError('Add at least one candidate with a full name and email.');
      return;
    }

    setSaving(true);
    try {
      const res = await addCandidates({ jobId, organizationId: orgId, candidates: cleaned });
      setSuccess(res.data.message || `${cleaned.length} candidate(s) added.`);
      setRows([emptyCandidate()]);

      const refreshed = await getCandidates(jobId);
      setExisting(refreshed.data.candidates || []);
    } catch (err: any) {
      console.error('addCandidates failed:', err);
      setError(err?.response?.data?.error || err.message || 'Failed to add candidates.');
    } finally {
      setSaving(false);
    }
  };

  const pickPDFs = (fileList: FileList | null) => {
    if (!fileList) return;
    const picked = Array.from(fileList).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    const rejected = Array.from(fileList).length - picked.length;
    if (rejected > 0) {
      setError(`${rejected} file(s) were skipped — only PDFs are accepted.`);
    }
    // Dedupe by name+size.
    const keyed = new Map<string, File>();
    [...pdfFiles, ...picked].forEach(f => keyed.set(`${f.name}__${f.size}`, f));
    const deduped = Array.from(keyed.values()).slice(0, 25);
    setPdfFiles(deduped);
  };

  const removePDF = (index: number) => {
    setPdfFiles(pdfFiles.filter((_, i) => i !== index));
  };

  const handleUploadPDFs = async () => {
    setError('');
    setSuccess('');
    setUploadResults([]);

    if (pdfFiles.length === 0) {
      setError('Drop at least one resume PDF first.');
      return;
    }

    const formData = new FormData();
    pdfFiles.forEach(f => formData.append('files', f));
    formData.append('jobId', jobId);
    formData.append('organizationId', orgId);

    setUploading(true);
    try {
      const res = await uploadMultiplePDFs(formData);
      setSuccess(res.data.message || `Processed ${pdfFiles.length} resume(s).`);
      setUploadResults(res.data.results || []);
      setPdfFiles([]);

      const refreshed = await getCandidates(jobId);
      setExisting(refreshed.data.candidates || []);
    } catch (err: any) {
      console.error('uploadMultiplePDFs failed:', err);
      setError(err?.response?.data?.error || err.message || 'Failed to process resumes.');
      if (err?.response?.data?.results) {
        setUploadResults(err.response.data.results);
      }
    } finally {
      setUploading(false);
    }
  };

  const pickCSV = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Only .csv files are accepted.');
      return;
    }
    setError('');
    setCsvFile(file);
  };

  const handleUploadCSV = async () => {
    setError('');
    setSuccess('');

    if (!csvFile) {
      setError('Choose a CSV file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', csvFile);
    formData.append('jobId', jobId);
    formData.append('organizationId', orgId);

    setCsvUploading(true);
    try {
      const res = await uploadCSV(formData);
      setSuccess(res.data.message || `Imported candidates from ${csvFile.name}.`);
      setCsvFile(null);

      const refreshed = await getCandidates(jobId);
      setExisting(refreshed.data.candidates || []);
    } catch (err: any) {
      console.error('uploadCSV failed:', err);
      setError(err?.response?.data?.error || err.message || 'Failed to import CSV.');
    } finally {
      setCsvUploading(false);
    }
  };

  const goToScreening = () => {
    router.push(`/screen?jobId=${jobId}&orgId=${orgId}`);
  };

  if (!jobId || !orgId) {
    return (
      <main style={{ minHeight: '100vh', padding: '40px 24px', maxWidth: '720px', margin: '0 auto' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', textDecoration: 'none', marginBottom: '32px' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <div className="card-white" style={{ padding: '32px', textAlign: 'center' }}>
          <AlertCircle size={28} color="var(--danger)" style={{ margin: '0 auto 12px', display: 'block' }} />
          <h1 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Missing job context</h1>
          <p style={{ color: 'var(--muted)', marginBottom: '20px' }}>
            Open this page from a specific job — the URL needs <code>?jobId=...&amp;orgId=...</code>.
          </p>
          <Link href="/jobs/new">
            <button className="btn-primary">Post a new job</button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', padding: '40px 24px', maxWidth: '900px', margin: '0 auto' }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', textDecoration: 'none', marginBottom: '32px' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px', color: 'var(--ink)' }}>
          Add Candidates
        </h1>
        <p style={{ color: 'var(--muted)' }}>
          {job ? (
            <>
              For role: <strong style={{ color: 'var(--ink)' }}>{job.title}</strong>
              {job.department ? ` · ${job.department}` : ''}
            </>
          ) : (
            <>Job ID: {jobId}</>
          )}
        </p>
      </div>

      <div style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', marginBottom: '24px', fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
        jobId: {jobId.slice(-6)} · orgId: {orgId.slice(-6)} · already added: {existing.length}
      </div>

      {error && (
        <div style={{ background: 'var(--danger-soft)', border: '1px solid rgba(184,52,31,0.25)', borderRadius: '10px', padding: '14px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} color="var(--danger)" />
          <p style={{ color: 'var(--danger)', fontSize: '14px', fontWeight: '500', margin: 0 }}>{error}</p>
        </div>
      )}

      {success && (
        <div style={{ background: 'var(--success-soft)', border: '1px solid rgba(47,143,93,0.3)', borderRadius: '10px', padding: '14px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={18} color="var(--success)" />
          <p style={{ color: 'var(--success)', fontSize: '14px', fontWeight: '500', margin: 0 }}>{success}</p>
        </div>
      )}

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setMode('resumes')}
          className={mode === 'resumes' ? 'btn-primary' : 'btn-secondary'}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Upload size={16} /> Upload resumes (PDF)
        </button>
        <button
          type="button"
          onClick={() => setMode('csv')}
          className={mode === 'csv' ? 'btn-primary' : 'btn-secondary'}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FileSpreadsheet size={16} /> Import CSV
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={mode === 'manual' ? 'btn-primary' : 'btn-secondary'}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Users size={16} /> Enter manually
        </button>
      </div>

      {mode === 'resumes' && (
        <div className="card-white" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ fontWeight: 700, fontSize: '17px' }}>Bulk resume ingest</h2>
            <span className="pill pill-gold" style={{ fontSize: '11px' }}>
              <Sparkles size={11} /> AI auto-extracts
            </span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '13.5px', marginBottom: '16px', lineHeight: 1.55 }}>
            Drop up to 25 resume PDFs at once. Gemini reads each one and extracts name, email, skills,
            experience, education and work history into a unified candidate record.
          </p>

          <label
            ref={dropRef}
            htmlFor="pdf-files"
            onDragOver={e => {
              e.preventDefault();
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)';
              (e.currentTarget as HTMLElement).style.background = 'var(--primary-soft)';
            }}
            onDragLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLElement).style.background = 'var(--surface-soft)';
            }}
            onDrop={e => {
              e.preventDefault();
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLElement).style.background = 'var(--surface-soft)';
              pickPDFs(e.dataTransfer.files);
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed var(--border)',
              borderRadius: '14px',
              padding: '40px 24px',
              cursor: 'pointer',
              background: 'var(--surface-soft)',
              marginBottom: '16px',
              transition: 'all 0.15s ease'
            }}
          >
            <FileUp size={34} color="var(--primary)" style={{ marginBottom: '10px' }} />
            <p style={{ color: 'var(--ink)', fontWeight: 700, marginBottom: '4px', fontSize: '15.5px' }}>
              Drop resumes here or click to browse
            </p>
            <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
              PDF only · up to 25 files · 15MB each
            </p>
            <input
              id="pdf-files"
              type="file"
              accept=".pdf,application/pdf"
              multiple
              onChange={e => pickPDFs(e.target.files)}
              style={{ display: 'none' }}
            />
          </label>

          {pdfFiles.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {pdfFiles.length} file{pdfFiles.length === 1 ? '' : 's'} ready
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px' }}>
                {pdfFiles.map((f, i) => (
                  <div
                    key={`${f.name}-${i}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      background: '#fff',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      fontSize: '13px'
                    }}
                  >
                    <FileText size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.name}
                    </span>
                    <span style={{ color: 'var(--muted-2)', fontSize: '11.5px', flexShrink: 0 }}>
                      {(f.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => removePDF(i)}
                      aria-label={`Remove ${f.name}`}
                      className="icon-btn"
                      style={{ padding: '4px' }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn-primary"
            onClick={handleUploadPDFs}
            disabled={uploading || pdfFiles.length === 0}
            style={{ width: '100%', padding: '14px', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="spin" /> AI is reading {pdfFiles.length} resume{pdfFiles.length === 1 ? '' : 's'}...
              </>
            ) : (
              <>
                <Sparkles size={16} /> Extract & import {pdfFiles.length || ''} resume{pdfFiles.length === 1 ? '' : 's'}
              </>
            )}
          </button>

          {uploadResults.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Extraction report
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {uploadResults.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      background: r.status === 'parsed' ? 'var(--success-soft)' : 'var(--danger-soft)',
                      border: `1px solid ${r.status === 'parsed' ? 'rgba(47,143,93,0.25)' : 'rgba(184,52,31,0.25)'}`,
                      borderRadius: '10px',
                      fontSize: '13px'
                    }}
                  >
                    {r.status === 'parsed' ? (
                      <FileCheck2 size={15} color="var(--success)" style={{ flexShrink: 0 }} />
                    ) : (
                      <FileWarning size={15} color="var(--danger)" style={{ flexShrink: 0 }} />
                    )}
                    <span style={{ fontWeight: 600, flexShrink: 0 }}>{r.filename}</span>
                    <span style={{ color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.status === 'parsed'
                        ? `${r.candidate?.fullName || 'Unknown'} · ${r.candidate?.skills?.length || 0} skills · ${r.candidate?.yearsOfExperience || 0}y exp`
                        : r.reason || 'Failed to parse'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'csv' && (
        <div className="card-white" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ fontWeight: 700, fontSize: '17px' }}>CSV import</h2>
            <span className="pill" style={{ fontSize: '11px' }}>
              <FileSpreadsheet size={11} /> Bulk add
            </span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '13.5px', marginBottom: '16px', lineHeight: 1.55 }}>
            Upload a .csv file to add many candidates at once. Expected columns:
            {' '}<code>fullName</code>, <code>email</code>, <code>phone</code>, <code>location</code>,
            {' '}<code>skills</code> (semicolon-separated), <code>yearsOfExperience</code>,
            {' '}<code>degree</code>, <code>field</code>, <code>institution</code>.
          </p>

          <label
            htmlFor="csv-file"
            onDragOver={e => {
              e.preventDefault();
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)';
              (e.currentTarget as HTMLElement).style.background = 'var(--primary-soft)';
            }}
            onDragLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLElement).style.background = 'var(--surface-soft)';
            }}
            onDrop={e => {
              e.preventDefault();
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLElement).style.background = 'var(--surface-soft)';
              pickCSV(e.dataTransfer.files);
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed var(--border)',
              borderRadius: '14px',
              padding: '40px 24px',
              cursor: 'pointer',
              background: 'var(--surface-soft)',
              marginBottom: '16px',
              transition: 'all 0.15s ease'
            }}
          >
            <FileSpreadsheet size={34} color="var(--primary)" style={{ marginBottom: '10px' }} />
            <p style={{ color: 'var(--ink)', fontWeight: 700, marginBottom: '4px', fontSize: '15.5px' }}>
              Drop a CSV file here or click to browse
            </p>
            <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
              .csv only · one file at a time
            </p>
            <input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              onChange={e => pickCSV(e.target.files)}
              style={{ display: 'none' }}
            />
          </label>

          {csvFile && (
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  fontSize: '13px'
                }}
              >
                <FileSpreadsheet size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                  {csvFile.name}
                </span>
                <span style={{ color: 'var(--muted-2)', fontSize: '11.5px', flexShrink: 0 }}>
                  {(csvFile.size / 1024).toFixed(0)} KB
                </span>
                <button
                  type="button"
                  onClick={() => setCsvFile(null)}
                  aria-label={`Remove ${csvFile.name}`}
                  className="icon-btn"
                  style={{ padding: '4px' }}
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn-primary"
            onClick={handleUploadCSV}
            disabled={csvUploading || !csvFile}
            style={{ width: '100%', padding: '14px', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
          >
            {csvUploading ? (
              <>
                <Loader2 size={16} className="spin" /> Importing CSV...
              </>
            ) : (
              <>
                <FileSpreadsheet size={16} /> Import candidates from CSV
              </>
            )}
          </button>
        </div>
      )}

      {mode === 'manual' && (
        <div className="card-white" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontWeight: '700' }}>Manual entry</h2>
            <span style={{ color: 'var(--muted)', fontSize: '13px' }}>
              {rows.length} row{rows.length === 1 ? '' : 's'}
            </span>
          </div>

          {rows.map((row, i) => (
            <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '12px', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.4px', margin: 0 }}>
                  Candidate {i + 1}
                </p>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}
                >
                  <X size={14} /> Remove
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Full name *</label>
                  <input className="input" value={row.fullName} onChange={e => updateRow(i, 'fullName', e.target.value)} placeholder="Jane Doe" />
                </div>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Email *</label>
                  <input className="input" value={row.email} onChange={e => updateRow(i, 'email', e.target.value)} placeholder="jane@example.com" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Phone</label>
                  <input className="input" value={row.phone} onChange={e => updateRow(i, 'phone', e.target.value)} placeholder="+250 ..." />
                </div>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Location</label>
                  <input className="input" value={row.location} onChange={e => updateRow(i, 'location', e.target.value)} placeholder="Kigali, RW" />
                </div>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Years of experience</label>
                  <input className="input" type="number" min="0" value={row.yearsOfExperience} onChange={e => updateRow(i, 'yearsOfExperience', e.target.value)} placeholder="3" />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Skills (comma-separated)</label>
                <input className="input" value={row.skills} onChange={e => updateRow(i, 'skills', e.target.value)} placeholder="Python, SQL, Airflow" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Degree</label>
                  <input className="input" value={row.degree} onChange={e => updateRow(i, 'degree', e.target.value)} placeholder="BSc" />
                </div>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Field</label>
                  <input className="input" value={row.field} onChange={e => updateRow(i, 'field', e.target.value)} placeholder="Computer Science" />
                </div>
                <div>
                  <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Institution</label>
                  <input className="input" value={row.institution} onChange={e => updateRow(i, 'institution', e.target.value)} placeholder="ALU" />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Resume / bio (optional)</label>
                <textarea className="input" rows={3} value={row.resumeText} onChange={e => updateRow(i, 'resumeText', e.target.value)} placeholder="Paste resume text or a short bio the AI can ground its scoring in..." />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addRow}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}
          >
            <Plus size={14} /> Add another candidate
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={handleSaveManual}
            disabled={saving}
            style={{ width: '100%', padding: '14px', fontSize: '16px' }}
          >
            {saving ? 'Saving candidates...' : `Save ${rows.length} candidate${rows.length === 1 ? '' : 's'}`}
          </button>
        </div>
      )}

      <div className="card-white" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontWeight: '700' }}>Candidates added to this job ({existing.length})</h2>
        </div>

        {existing.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
            No candidates yet. Add at least one before running AI screening.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {existing.map(c => (
              <div
                key={c._id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: 'var(--surface-soft)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px'
                }}
              >
                <div>
                  <p style={{ fontWeight: '600', margin: 0 }}>{c.fullName}</p>
                  <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>
                    {c.email}
                    {c.yearsOfExperience ? ` · ${c.yearsOfExperience}y exp` : ''}
                    {c.location ? ` · ${c.location}` : ''}
                    {c.skills?.length ? ` · ${c.skills.slice(0, 4).join(', ')}${c.skills.length > 4 ? '...' : ''}` : ''}
                  </p>
                </div>
                <span style={{ color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase' }}>{c.source}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn-primary"
        onClick={goToScreening}
        disabled={existing.length === 0}
        style={{ width: '100%', padding: '16px', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
      >
        <Sparkles size={18} /> Continue to AI screening
      </button>

      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}

export default function CandidatesPageWrapper() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', color: 'var(--muted)' }}>Loading...</div>}>
      <CandidatesPage />
    </Suspense>
  );
}
