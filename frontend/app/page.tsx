'use client';
import { useState, useEffect } from 'react';
import { getOrganizations, deleteOrganization } from '@/lib/api';
import Link from 'next/link';
import {
  Building2,
  Briefcase,
  Users,
  Sparkles,
  ArrowRight,
  Trash2,
  ShieldCheck,
  Scale,
  Zap,
  Plus,
  AlertTriangle,
  Mail
} from 'lucide-react';
import BrandMark from '@/components/BrandMark';

export default function Home() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const loadOrgs = () => {
    setLoading(true);
    getOrganizations()
      .then(res => setOrgs(res.data.organizations))
      .catch(() => setOrgs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrgs();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleDelete = async (id: string, name: string) => {
    setDeletingId(id);
    try {
      const res = await deleteOrganization(id);
      const d = res.data.deleted;
      setToast({
        kind: 'ok',
        msg: `Deleted "${name}" · ${d.jobs} job(s), ${d.candidates} candidate(s), ${d.screeningResults} result(s) removed.`
      });
      setOrgs(orgs.filter(o => o._id !== id));
    } catch (err: any) {
      setToast({
        kind: 'err',
        msg: err?.response?.data?.error || 'Failed to delete organization.'
      });
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  };

  return (
    <>
      <nav className="nav">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
          <span className="brand-mark">
            <BrandMark size={18} />
          </span>
          <span className="brand-wordmark">OrgScreen</span>
          <span className="pill pill-gold" style={{ marginLeft: '8px' }}>Built for Africa</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link href="/team">
            <button className="btn-ghost">Team</button>
          </Link>
          <Link href="/results/all">
            <button className="btn-ghost">Results</button>
          </Link>
          <Link href="/setup">
            <button className="btn-primary" style={{ padding: '10px 18px', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={15} /> New Organization
            </button>
          </Link>
        </div>
      </nav>

      <main style={{ minHeight: '100vh', padding: '56px 24px 80px', maxWidth: '1100px', margin: '0 auto' }}>

        {toast && (
          <div
            className="fade-in"
            style={{
              position: 'fixed',
              top: '84px',
              right: '24px',
              zIndex: 60,
              background: toast.kind === 'ok' ? 'var(--success-soft)' : 'var(--danger-soft)',
              color: toast.kind === 'ok' ? 'var(--success)' : 'var(--danger)',
              border: `1px solid ${toast.kind === 'ok' ? 'rgba(47,143,93,0.3)' : 'rgba(184,52,31,0.3)'}`,
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 500,
              maxWidth: '420px',
              boxShadow: '0 10px 30px rgba(15,12,10,0.08)'
            }}
          >
            {toast.msg}
          </div>
        )}

        {/* Hero */}
        <section className="card-ink accent-kente fade-in" style={{ marginBottom: '48px' }}>
          <div style={{ position: 'relative', zIndex: 1, maxWidth: '640px' }}>
            <h1 style={{ fontSize: '48px', fontWeight: 700, lineHeight: 1.08, marginBottom: '18px', color: '#FBF8F1' }}>
              AI screening that thinks<br />
              <span style={{ color: '#F8B77A' }}>like your organization.</span>
            </h1>
            <p style={{ color: 'rgba(251,248,241,0.75)', fontSize: '17px', lineHeight: 1.65, maxWidth: '560px' }}>
              Teach OrgScreen your hiring DNA — culture, priorities, ideal personas — and it screens every candidate the way you would.
              Ranked shortlists, radar-chart scoring, fairness flags, plain-language reasoning.
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '28px', flexWrap: 'wrap' }}>
              <Link href="/setup">
                <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  Start with your org <ArrowRight size={16} />
                </button>
              </Link>
              <Link href="/jobs/new">
                <button
                  className="btn-secondary"
                  style={{
                    background: 'rgba(251,248,241,0.08)',
                    color: '#FBF8F1',
                    borderColor: 'rgba(251,248,241,0.25)'
                  }}
                >
                  Post a job
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* Value props */}
        <section style={{ marginBottom: '56px' }}>
          <div className="adinkra-rule">How OrgScreen is different</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
            {[
              { icon: <ShieldCheck size={22} color="var(--primary)" />, title: 'Institutional RAG', desc: 'Your culture, personas, past hires go into every prompt — not generic AI.' },
              { icon: <Scale size={22} color="var(--primary)" />, title: 'Fairness layer', desc: 'Flags candidates penalized for gaps, non-linear paths, or geography.' },
              { icon: <Zap size={22} color="var(--primary)" />, title: 'Instant re-rank', desc: 'Change skills-vs-experience weights and reshuffle the list without re-calling Gemini.' }
            ].map((b, i) => (
              <div key={i} className="card-white" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {b.icon}
                </span>
                <h3 style={{ fontSize: '17px' }}>{b.title}</h3>
                <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.55 }}>{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Action cards */}
        <section style={{ marginBottom: '56px' }}>
          <div className="adinkra-rule">Recruiter workflow</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            {[
              { href: '/setup', icon: <Building2 size={20} />, title: '1 · Setup organization', desc: 'Encode culture, priorities, hiring DNA.' },
              { href: '/jobs/new', icon: <Briefcase size={20} />, title: '2 · Post a job', desc: 'Define the role and skills.' },
              { href: '/screen', icon: <Sparkles size={20} />, title: '3 · Run screening', desc: 'Gemini scores every candidate.' },
              { href: '/results/all', icon: <Users size={20} />, title: '4 · Review shortlist', desc: 'Radar charts, reasoning, fairness flags.' }
            ].map((item, i) => (
              <Link key={i} href={item.href} style={{ textDecoration: 'none' }}>
                <div
                  className="card-white"
                  style={{ cursor: 'pointer', height: '100%' }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = 'translateY(-3px)';
                    el.style.borderColor = 'var(--primary)';
                    el.style.boxShadow = '0 12px 28px rgba(224,83,27,0.12)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = 'translateY(0)';
                    el.style.borderColor = 'var(--border)';
                    el.style.boxShadow = '';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)', marginBottom: '12px' }}>
                    {item.icon}
                    <ArrowRight size={14} style={{ marginLeft: 'auto', color: 'var(--muted-2)' }} />
                  </div>
                  <h3 style={{ fontSize: '15px', marginBottom: '4px' }}>{item.title}</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '13.5px', lineHeight: 1.55 }}>{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Organizations */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 700 }}>Your organizations</h2>
              <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '2px' }}>
                Each organization is a self-contained hiring DNA profile.
              </p>
            </div>
            <Link href="/setup" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '14px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={14} /> Add new
            </Link>
          </div>

          {loading ? (
            <p style={{ color: 'var(--muted)' }}>Loading organizations...</p>
          ) : orgs.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '56px', border: '2px dashed var(--border)', background: 'transparent' }}>
              <Building2 size={40} color="var(--muted-2)" style={{ margin: '0 auto 14px', display: 'block' }} />
              <p style={{ color: 'var(--muted)', marginBottom: '18px', fontSize: '15px' }}>
                No organizations yet. Set up your first hiring DNA profile.
              </p>
              <Link href="/setup"><button className="btn-primary">Setup first organization</button></Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {orgs.map(org => (
                <div key={org._id} className="card-white" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: 'var(--primary-soft)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Building2 size={20} color="var(--primary)" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ fontSize: '16px', marginBottom: '2px' }}>{org.name}</h3>
                      <p style={{ color: 'var(--muted)', fontSize: '13.5px' }}>
                        {org.industry}
                        {org.cultureValues?.length ? ` · ${org.cultureValues.length} values` : ''}
                        {org.idealCandidatePersonas?.length ? ` · ${org.idealCandidatePersonas.length} personas` : ''}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {confirmingId === org._id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--danger-soft)', borderRadius: '10px', padding: '6px 8px 6px 12px', border: '1px solid rgba(184,52,31,0.25)' }}>
                        <AlertTriangle size={14} color="var(--danger)" />
                        <span style={{ color: 'var(--danger)', fontSize: '13px', fontWeight: 500 }}>Delete {org.name}?</span>
                        <button
                          className="btn-ghost"
                          onClick={() => setConfirmingId(null)}
                          style={{ padding: '6px 10px', fontSize: '13px' }}
                          disabled={deletingId === org._id}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn-danger"
                          onClick={() => handleDelete(org._id, org.name)}
                          disabled={deletingId === org._id}
                          style={{ padding: '6px 12px', fontSize: '13px' }}
                        >
                          {deletingId === org._id ? 'Deleting...' : 'Yes, delete'}
                        </button>
                      </div>
                    ) : (
                      <>
                        <Link href={`/jobs/new?orgId=${org._id}`}>
                          <button className="btn-primary" style={{ padding: '10px 16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Post job <ArrowRight size={14} />
                          </button>
                        </Link>
                        <button
                          className="icon-btn"
                          onClick={() => setConfirmingId(org._id)}
                          title={`Delete ${org.name}`}
                          aria-label={`Delete ${org.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      <footer
        style={{
          borderTop: '1px solid var(--border)',
          background: 'var(--surface-soft)',
          marginTop: '40px'
        }}
      >
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            padding: '32px 24px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '20px',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span className="brand-mark">
              <BrandMark size={16} />
            </span>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>OrgScreen</span>
            <span className="pill pill-brand" style={{ background: 'var(--primary-soft)', color: 'var(--primary)', borderColor: 'rgba(224,83,27,0.25)' }}>
              <Sparkles size={12} /> Powered by Gemini 2.5 Flash
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <a
              href="mailto:silogrp1@gmail.com"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--ink)',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              <Mail size={14} color="var(--primary)" /> silogrp1@gmail.com
            </a>
            <Link
              href="/team"
              style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '14px' }}
            >
              Team
            </Link>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: '14px 24px',
            textAlign: 'center',
            color: 'var(--muted-2)',
            fontSize: '12.5px',
            letterSpacing: '0.04em'
          }}
        >
          OrgScreen · Umurava AI Hackathon · Built with Gemini, Next.js, and a lot of Kinyarwanda coffee.
        </div>
      </footer>
    </>
  );
}
