import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://woqslyuyahrecuhxcygx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcXNseXV5YWhyZWN1aHhjeWd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTg4NDEsImV4cCI6MjA5MTY3NDg0MX0.gUb0WHxh11-NtS9hIGXQQRFcLItkgUVSqG4DAP6E-XU'
)

// ── Safe field mapper — never crashes on missing/undefined fields ─────────────
const mapLead = (row) => {
  const score = row.propensity_score || row.score || 0
  return {
    id:      row.id || Date.now(),
    name:    row.lead_name  || row.email?.split('@')[0] || 'Unknown',
    title:   row.lead_title || 'Unknown title',
    email:   row.email      || '',
    company: (row.company_url || '')
      .replace(/https?:\/\//, '').replace('www.', '').split('/')[0].split('.')[0] || 'Unknown',
    website: row.company_url || '',
    score,
    delta: 0,
    badges: Array.isArray(row.badges) ? row.badges : [],
    signals: {
      funding:   row.research?.estimated_revenue || row.signals?.funding   || '—',
      techStack: row.research?.tech_stack        || row.signals?.techStack || '—',
      hiring:    row.research?.open_roles        || row.signals?.hiring    || '—',
      visits:    row.signals?.visits || 1,
    },
    icp: {
      size:     row.research?.company_size || row.icp?.size     || '—',
      industry: row.research?.industry     || row.icp?.industry || '—',
      fit:      score,
    },
    companyOverview:   row.research?.company_overview || '',
    competitors:       Array.isArray(row.research?.top_competitors)     ? row.research.top_competitors     : [],
    estimatedRevenue:  row.research?.estimated_revenue || '—',
    businessGoals:     Array.isArray(row.research?.business_goals_2026) ? row.research.business_goals_2026 : [],
    salesAngle:        row.research?.sales_angle    || '',
    recommendedAction: row.recommended_action       || row.research?.sales_angle || '',
    activity: (row.recommended_action || row.research?.sales_angle || 'New inbound lead').slice(0, 65),
    time: row.created_at
      ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'just now',
    status: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low',
  }
}

// ── Merge enrichment data into an existing lead object ────────────────────────
function applyEnrichment(lead, data) {
  const score = data.score ?? lead.score
  return {
    ...lead,
    score,
    badges:    data.badges?.length ? data.badges : lead.badges,
    signals: {
      funding:   data.signals?.funding    || lead.signals.funding,
      techStack: data.signals?.tech_stack || lead.signals.techStack,
      hiring:    data.signals?.open_roles || lead.signals.hiring,
      visits:    lead.signals.visits,
    },
    icp: {
      size:     data.signals?.company_size || lead.icp.size,
      industry: data.signals?.industry     || lead.icp.industry,
      fit:      score,
    },
    companyOverview:   data.company_overview  || lead.companyOverview,
    competitors:       data.top_competitors   || lead.competitors,
    estimatedRevenue:  data.estimated_revenue || lead.estimatedRevenue,
    businessGoals:     data.business_goals    || lead.businessGoals,
    salesAngle:        data.sales_angle       || lead.salesAngle,
    recommendedAction: data.recommended_action || lead.recommendedAction,
    status: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low',
  }
}

const BADGE_COLORS = {
  'High Intent':     { bg: 'rgba(79,70,229,0.08)',   color: '#4338CA', border: 'rgba(79,70,229,0.2)' },
  'Decision Maker':  { bg: 'rgba(16,185,129,0.08)',  color: '#059669', border: 'rgba(16,185,129,0.2)' },
  'Competitor User': { bg: 'rgba(239,68,68,0.08)',   color: '#DC2626', border: 'rgba(239,68,68,0.2)' },
  'Series C+':       { bg: 'rgba(139,92,246,0.08)',  color: '#7C3AED', border: 'rgba(139,92,246,0.2)' },
  'Growing Team':    { bg: 'rgba(245,158,11,0.08)',  color: '#D97706', border: 'rgba(245,158,11,0.2)' },
  'Early Stage':     { bg: 'rgba(100,116,139,0.08)', color: '#475569', border: 'rgba(100,116,139,0.2)' },
  'Wrong Persona':   { bg: 'rgba(239,68,68,0.06)',   color: '#DC2626', border: 'rgba(239,68,68,0.15)' },
}

function ScoreRing({ score, size = 44 }) {
  const r = (size / 2) - 4
  const circ = 2 * Math.PI * r
  const pct = (score || 0) / 100
  const color = score >= 80 ? 'var(--score-high)' : score >= 60 ? 'var(--score-mid)' : 'var(--score-low)'
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth="3"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }}/>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="13" fontWeight="700" fontFamily="var(--font-mono)"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}>
        {score}
      </text>
    </svg>
  )
}

function Badge({ label }) {
  const s = BADGE_COLORS[label] || { bg: 'var(--surface2)', color: 'var(--muted)', border: 'var(--border)' }
  return (
    <span style={{ fontSize: 13, fontFamily: 'var(--font-head)', fontWeight: 600, padding: '2.5px 8px', borderRadius: 4, background: s.bg, color: s.color, border: `0.5px solid ${s.border}`, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function StatusDot({ status }) {
  const c = { high: 'var(--status-high)', medium: 'var(--status-medium)', low: 'var(--status-low)' }[status] || 'var(--muted)'
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0, boxShadow: (status === 'high' || status === 'medium') ? `0 0 8px ${c}` : 'none' }}/>
}

function ScanLine() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30%', background: 'linear-gradient(to bottom, transparent, var(--border), transparent)', animation: 'scan 4s linear infinite', pointerEvents: 'none', zIndex: 0 }}/>
  )
}

function LeadCard({ lead, selected, onClick, onDelete, index }) {
  const domain = (lead.website || '')
    .replace(/https?:\/\//, '').replace('www.', '').split('/')[0]
  const logoUrl = domain ? `https://logo.clearbit.com/${domain}` : null
  const fallbackLogoUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null
  const companyDisplay = lead.company
    ? lead.company.charAt(0).toUpperCase() + lead.company.slice(1)
    : 'Unknown'

  return (
    <div className="lead-card-container">
      <div onClick={onClick} className={`lead-card-base lead-card-${lead.status}`} style={{
        background: selected ? 'var(--bg)' : undefined,
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        outline: selected ? 'none' : `1px solid rgba(var(--status-${lead.status}-rgb), 0.2)`,
        outlineOffset: -1,
        animation: 'fadeUp 0.4s ease both',
        animationDelay: `${index * 0.06}s`,
        boxShadow: selected ? 'var(--shadow)' : '0 1px 2px rgba(0,0,0,0.02)',
      }}>
        {selected && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--accent)', borderRadius: '2px 0 0 2px' }}/>}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {/* Company logo */}
          {(logoUrl || fallbackLogoUrl) && (
            <img
              src={logoUrl || fallbackLogoUrl}
              alt={companyDisplay}
              onError={e => {
                if (e.currentTarget.src !== fallbackLogoUrl) {
                  e.currentTarget.src = fallbackLogoUrl
                } else {
                  e.currentTarget.style.display = 'none'
                }
              }}
              style={{
                width: 38, height: 38, borderRadius: 8,
                objectFit: 'contain', background: '#fff',
                padding: 3, border: '1px solid var(--border)',
                flexShrink: 0, alignSelf: 'center',
              }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <StatusDot status={lead.status}/>
              <span style={{ fontFamily: 'var(--font-head)', fontWeight: 750, fontSize: 17, color: 'var(--text)', letterSpacing: '-0.01em' }}>{lead.name}</span>
            </div>
            <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8, fontWeight: 500 }}>
              {lead.title} · <span style={{ color: 'var(--text)', opacity: 0.8 }}>{companyDisplay}</span>
            </div>
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {(lead.badges || []).map(b => <Badge key={b} label={b}/>)}
            </div>
          </div>
          {/* Right column: Tag -> Score -> Delete */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            <span style={{
              fontSize: 12, fontWeight: 800, fontFamily: 'var(--font-head)',
              color: (lead.delta||0) > 0 ? 'var(--accent2)' : (lead.delta||0) < 0 ? 'var(--accent3)' : 'var(--status-low)',
              background: (lead.delta||0) > 0 ? 'rgba(16,185,129,0.06)' : (lead.delta||0) < 0 ? 'rgba(239,68,68,0.06)' : 'rgba(59, 130, 246, 0.08)',
              border: `1px solid ${(lead.delta||0) > 0 ? 'rgba(16,185,129,0.15)' : (lead.delta||0) < 0 ? 'rgba(239,68,68,0.15)' : 'rgba(59, 130, 246, 0.2)'}`,
              padding: '2px 8px', borderRadius: 4, transform: 'translateY(-2px)'
            }}>
              {(lead.delta||0) > 0 ? `+${lead.delta} RISING` : (lead.delta||0) < 0 ? `${lead.delta} FALLING` : 'STEADY'}
            </span>
            <ScoreRing score={lead.score || 0} size={48}/>
            <div className="delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(lead.id); }} title="Delete lead">
              DELETE LEAD
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '0.5px solid var(--border)', fontSize: 13, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{lead.activity}</span>
          <span style={{ flexShrink: 0, paddingRight: 24, fontWeight: 600 }}>{lead.time}</span>
        </div>
      </div>
    </div>
  )
}

function SignalBar({ label, value }) {
  const pct = Math.min(Math.max(Number(value) || 0, 0), 100)
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12, color: 'var(--muted)' }}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span style={{ color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{Math.round(pct)}%</span>
      </div>
      <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2 }}>
        <div style={{ height: 4, width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent2), var(--accent))', borderRadius: 2, transition: 'width 0.8s ease' }}/>
      </div>
    </div>
  )
}

// ── Detail Pane — real enrichment, no gray screen ─────────────────────────────
function DetailPane({ lead, onEnriched }) {
  const [enriching,   setEnriching]   = useState(false)
  const [enriched,    setEnriched]    = useState(false)
  const [enrichError, setEnrichError] = useState('')
  const [lastId,      setLastId]      = useState(lead.id)

  if (lead.id !== lastId) {
    setEnriched(false); setEnrichError(''); setLastId(lead.id)
  }

  async function runEnrich() {
    setEnriching(true); setEnrichError('')
    try {
      const url = lead.website.startsWith('http') ? lead.website : `https://${lead.website}`
      const res = await fetch('http://localhost:8000/score-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lead.email, company_url: url, lead_name: lead.name, lead_title: lead.title }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      onEnriched(lead.id, data)
      setEnriched(true)
    } catch {
      setEnrichError('Backend not reachable. Is uvicorn running on port 8000?')
    } finally {
      setEnriching(false)
    }
  }

  const sidebarDomain = (lead.website || '')
    .replace(/https?:\/\//, '').replace('www.', '').split('/')[0]
  const sidebarLogoUrl = sidebarDomain ? `https://logo.clearbit.com/${sidebarDomain}` : null
  const sidebarFallbackUrl = sidebarDomain ? `https://www.google.com/s2/favicons?domain=${sidebarDomain}&sz=64` : null
  const sidebarCompany = lead.company
    ? lead.company.charAt(0).toUpperCase() + lead.company.slice(1)
    : 'Unknown'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeUp 0.3s ease' }}>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20, position: 'relative', overflow: 'hidden' }}>
        <ScanLine/>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            {/* Company logo in sidebar */}
            <div style={{ width: 52, height: 52, borderRadius: 10, background: '#fff', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
              {(sidebarLogoUrl || sidebarFallbackUrl) ? (
                <img
                  src={sidebarLogoUrl || sidebarFallbackUrl}
                  alt={sidebarCompany}
                  onError={e => {
                    if (e.currentTarget.src !== sidebarFallbackUrl) {
                      e.currentTarget.src = sidebarFallbackUrl
                    } else {
                      e.currentTarget.outerHTML = `<span style="font-family:var(--font-head);font-weight:800;font-size:24px;color:var(--accent)">${(lead.name||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</span>`
                    }
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }}
                />
              ) : (
                <span style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 24, color: 'var(--accent)' }}>
                  {(lead.name || '?').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                </span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 22, color: 'var(--text)', letterSpacing: '-0.01em' }}>{lead.name}</div>
              <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 2 }}>{lead.title} · <span style={{ color: 'var(--text)' }}>{sidebarCompany}</span></div>
              <div style={{ fontSize: 13, color: 'var(--accent2)', marginTop: 4, fontWeight: 600 }}>{lead.email}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <ScoreRing score={lead.score || 0} size={68}/>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Propensity</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 16 }}>
            {(lead.badges || []).map(b => <Badge key={b} label={b}/>)}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text)', background: 'var(--surface2)', padding: '10px 14px', borderRadius: 8, borderLeft: '3px solid var(--accent)', lineHeight: 1.6, opacity: 0.9 }}>
            {lead.companyOverview || lead.activity}
          </div>
        </div>
      </div>

      {/* ICP bars */}
      <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 8, padding: 18 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: 14, textTransform: 'uppercase' }}>ICP Fit Breakdown</div>
        <SignalBar label="Overall ICP score"  value={lead.icp?.fit ?? lead.score}/>
        <SignalBar label="Company size match" value={Math.max((lead.score||0) - 5, 0)}/>
        <SignalBar label="Industry alignment" value={Math.min((lead.score||0) + 3, 99)}/>
        <SignalBar label="Tech stack overlap" value={Math.max((lead.score||0) - 15, 10)}/>
        <SignalBar label="Buying signals"     value={Math.min((lead.signals?.visits||1) * 13, 99)}/>
      </div>

      {/* Enrichment signals */}
      <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 8, padding: 18 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: 12, textTransform: 'uppercase' }}>AI Investigation Results</div>
        {[
          ['Funding',      lead.signals?.funding   || '—'],
          ['Tech stack',   lead.signals?.techStack  || '—'],
          ['Open roles',   lead.signals?.hiring     || '—'],
          ['Page visits',  `${lead.signals?.visits || 1}x this week`],
          ['Company size', lead.icp?.size           || '—'],
          ['Industry',     lead.icp?.industry       || '—'],
          ['Est. revenue', lead.estimatedRevenue    || '—'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13.5, gap: 12 }}>
            <span style={{ color: 'var(--muted)', flexShrink: 0, fontWeight: 500 }}>{k}</span>
            <span style={{ color: 'var(--text)', fontWeight: 600, textAlign: 'right' }}>{v}</span>
          </div>
        ))}

        {(lead.competitors || []).length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Top competitors</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {lead.competitors.map(c => (
                <span key={c} style={{ fontSize: 12, padding: '2.5px 10px', borderRadius: 4, background: 'var(--surface2)', color: 'var(--accent3)', border: '1px solid var(--border)', fontWeight: 600 }}>{c}</span>
              ))}
            </div>
          </div>
        )}

        {(lead.businessGoals || []).length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Strategic Goals 2026</div>
            {lead.businessGoals.map((g, i) => (
              <div key={i} style={{ fontSize: 13.5, color: 'var(--text)', padding: '5px 0 5px 12px', borderLeft: '2px solid var(--accent)', marginBottom: 6, lineHeight: 1.5, background: 'var(--surface2)', borderRadius: '0 4px 4px 0', opacity: 0.9 }}>{g}</div>
            ))}
          </div>
        )}

        {lead.salesAngle && (
          <div style={{ marginTop: 14, fontSize: 13.5, color: 'var(--accent2)', background: 'var(--surface2)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', lineHeight: 1.7, fontWeight: 500 }}>
            <span style={{ textTransform: 'uppercase', fontSize: 11, display: 'block', marginBottom: 4, opacity: 0.7 }}>Recommended Sales Angle</span>
            {lead.salesAngle}
          </div>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: 14, textTransform: 'uppercase', fontWeight: 600 }}>Action Plan</div>
        <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.7, marginBottom: 18, opacity: 0.9 }}>
          {lead.recommendedAction || (
            lead.status === 'high'
              ? `High-priority outreach. ${lead.name} shows strong buying intent — ${lead.signals?.hiring} suggests budget. Lead with ROI angle. Ping within 30 min.`
              : lead.status === 'medium'
              ? `Nurture sequence recommended. ${lead.name} is engaged but not ready. Enroll in 5-touch email drip. Re-score in 7 days.`
              : `Low priority. ${lead.name} shows weak signals. Add to newsletter list. Do not assign to a rep yet.`
          )}
        </div>

        <button onClick={runEnrich} disabled={enriching} className="btn-premium" style={{
          width: '100%', padding: '14px 0', borderRadius: 8,
          border: enriched ? '1px solid var(--accent2)' : 'none',
          background: enriching ? 'var(--surface2)' : enriched ? 'var(--surface2)' : 'var(--accent)',
          color: enriching ? 'var(--accent)' : enriched ? 'var(--accent2)' : '#FFFFFF',
          fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 800,
          cursor: enriching ? 'default' : 'pointer', letterSpacing: '0.06em', transition: 'all 0.2s ease',
          boxShadow: enriching || enriched ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.2)'
        }}>
          {enriching ? '⬡ RE-EVALUATING...' : enriched ? '✓ RE-EVALUATED' : '⬡ START AI RE-EVALUATION'}
        </button>

        {enriched && !enrichError && (
          <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--accent2)', background: 'var(--surface2)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', animation: 'fadeUp 0.3s ease', lineHeight: 1.7, fontWeight: 500 }}>
            ✓ Analysis complete · Signals mapped · Strategy updated
          </div>
        )}
        {enrichError && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#DC2626', background: 'rgba(239,68,68,0.06)', padding: '8px 10px', borderRadius: 5, border: '0.5px solid rgba(239,68,68,0.15)', animation: 'fadeUp 0.3s ease' }}>
            ✗ {enrichError}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="stat-card" style={{ background: 'var(--dash-gradient)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px', boxShadow: 'var(--shadow)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accent || 'var(--accent)' }}/>
      <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 32, color: accent || 'var(--text)', letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, fontWeight: 500 }}>{sub}</div>}
    </div>
  )
}

function InputField({ label, value, onChange, placeholder, required }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', gap: 6, alignItems: 'center' }}>
        {label}
        {required
          ? <span style={{ color: '#EF4444', fontSize: 11, fontWeight: 600 }}>required</span>
          : <span style={{ color: '#94A3B8', fontSize: 11 }}>optional — improves score</span>}
      </div>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: '100%', background: 'var(--surface2)',
          border: '1px solid var(--border2)',
          borderRadius: 6, padding: '10px 14px', fontSize: 14, color: 'var(--text)',
          fontFamily: 'var(--font-mono)', outline: 'none', transition: 'border-color 0.15s',
        }}/>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [leads,    setLeads]    = useState([])
  const [selected, setSelected] = useState(null)
  const [filter,   setFilter]   = useState('all')
  const [search,   setSearch]   = useState('')
  const [adding,   setAdding]   = useState(false)
  const [scoring,  setScoring]  = useState(false)
  const [scoreError, setScoreError] = useState('')
  const [isLive,   setIsLive]   = useState(false)
  const [isSimulating, setIsSimulating] = useState(false)
  const [theme,    setTheme]    = useState(localStorage.getItem('theme') || 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const [newEmail, setNewEmail] = useState('')
  const [newUrl,   setNewUrl]   = useState('')
  const [newName,  setNewName]  = useState('')
  const [newTitle, setNewTitle] = useState('')

  async function refreshLeads() {
    try {
      const res = await fetch('http://localhost:8000/leads')
      const data = await res.json()
      if (data.leads?.length > 0) {
        const mapped = data.leads.map(mapLead)
        setLeads(mapped)
        setSelected(prev => mapped.find(l => l.id === prev?.id) || mapped[0])
      }
    } catch {
      console.log('Backend offline — refresh failed')
    }
  }

  useEffect(() => {
    // 1. Initial fetch
    refreshLeads()

    // 2. Supabase realtime — new scored lead appears instantly without refresh
    const channel = supabase
      .channel('realtime-leads')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, (payload) => {
        const newLead = mapLead(payload.new)
        setLeads(prev => [newLead, ...prev.filter(l => l.email !== newLead.email)])
        setSelected(prev => prev ?? newLead)
      })
      .subscribe(status => setIsLive(status === 'SUBSCRIBED'))

    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── Simulation Engine — Drifts scores every 5-10s to show trend tags ──────────
  useEffect(() => {
    if (!isSimulating || leads.length === 0) return

    const msgs = [
      "Detected tech stack shift to AWS/K8s",
      "VP of Sales viewed pricing page",
      "High-intent web visit spike (3x)",
      "Increased hiring for Sales roles",
      "Series B funding rumors detected",
      "Account activity cooling down",
      "New strategic growth signal match",
    ]

    const interval = setInterval(() => {
      setLeads(prev => {
        const idx = Math.floor(Math.random() * prev.length)
        const lead = prev[idx]
        const drift = Math.floor(Math.random() * 11) - 5 // -5 to +5
        const baseScore = lead.score || 50
        const newScore = Math.min(Math.max(baseScore + drift, 0), 100)
        
          const updated = {
            ...lead,
            score: newScore,
            delta: drift,
            activity: msgs[Math.floor(Math.random() * msgs.length)],
            status: newScore >= 80 ? 'high' : newScore >= 60 ? 'medium' : 'low'
          }

        const newLeads = [...prev]
        newLeads[idx] = updated
        return newLeads
      })
    }, 2000) // ~7 seconds average

    return () => clearInterval(interval)
  }, [isSimulating, leads.length])

  // ── Revert on simulation stop ───────────────────────────────────────────────
  useEffect(() => {
    if (!isSimulating) refreshLeads()
  }, [isSimulating])

  async function seedTestData() {
    const TEST_LEADS = [
      { lead_name: "James Reyes",    lead_title: "VP of Sales",         email: "jreyes@shopify.com",       company_url: "https://shopify.com" },
      { lead_name: "Priya Nair",     lead_title: "Head of RevOps",      email: "priya@notion.so",          company_url: "https://notion.so" },
      { lead_name: "Carlos Mendoza", lead_title: "Sales Director",      email: "c.mendoza@freshworks.com", company_url: "https://freshworks.com" },
      { lead_name: "Angela Tan",     lead_title: "CRO",                 email: "angela@hubspot.com",       company_url: "https://hubspot.com" },
      { lead_name: "David Kim",      lead_title: "VP of Revenue",       email: "david@canva.com",          company_url: "https://canva.com" },
      { lead_name: "Sophie Leclerc", lead_title: "Head of Sales",       email: "sophie@monday.com",        company_url: "https://monday.com" },
      { lead_name: "Raj Patel",      lead_title: "Sales Manager",       email: "raj@zendesk.com",          company_url: "https://zendesk.com" },
      { lead_name: "Nina Cruz",      lead_title: "Director of Growth",  email: "nina@stripe.com",          company_url: "https://stripe.com" },
      { lead_name: "Tom Reyes",      lead_title: "VP of Partnerships",  email: "tom@airtable.com",         company_url: "https://airtable.com" },
    ]

    setScoring(true)
    setScoreError('')
    let succeeded = 0
    let failed = 0

    for (let i = 0; i < TEST_LEADS.length; i++) {
      const lead = TEST_LEADS[i]
      try {
        const res = await fetch('http://localhost:8000/score-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lead),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        succeeded++
        console.log(`✓ Scored ${i+1}/${TEST_LEADS.length}: ${lead.lead_name}`)
      } catch (err) {
        failed++
        console.error(`✗ Failed ${lead.lead_name}:`, err)
      }
    }

    await refreshLeads()
    setScoring(false)
    setAdding(false)

    if (failed === 0) {
      alert(`✓ Successfully scored all ${succeeded} leads with real AI scores!`)
    } else {
      setScoreError(`Scored ${succeeded} leads. ${failed} failed — is the backend running on port 8000?`)
    }
  }

  async function handleDeleteLead(leadId) {
    if (!window.confirm('Are you sure you want to delete this lead? This cannot be undone.')) return
    
    try {
      const { error } = await supabase.from('leads').delete().eq('id', leadId)
      if (error) throw error
      
      setLeads(prev => prev.filter(l => l.id !== leadId))
      if (selected?.id === leadId) setSelected(null)
    } catch {
      alert('Error deleting lead. Please try again.')
    }
  }

  function handleEnriched(leadId, data) {
    setLeads(prev => prev.map(l => l.id === leadId ? applyEnrichment(l, data) : l))
    setSelected(prev => prev?.id === leadId ? applyEnrichment(prev, data) : prev)
  }

  async function handleScore() {
    if (!newEmail.trim() || !newUrl.trim()) {
      setScoreError('Email and Company URL are required.')
      return
    }
    setScoreError('')
    setScoring(true)
    try {
      const res = await fetch('http://localhost:8000/score-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:       newEmail.trim(),
          company_url: newUrl.trim(),
          lead_name:   newName.trim(),
          lead_title:  newTitle.trim(),
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()

      const newLead = mapLead({
        id:           Date.now(),
        lead_name:    newName,
        lead_title:   newTitle,
        email:        newEmail,
        company_url:  newUrl,
        score:        data.score,
        badges:       data.badges,
        recommended_action: data.recommended_action,
        research: {
          company_overview:    data.company_overview,
          estimated_revenue:   data.estimated_revenue,
          top_competitors:     data.top_competitors,
          business_goals_2026: data.business_goals,
          tech_stack:          data.signals?.tech_stack,
          open_roles:          data.signals?.open_roles,
          company_size:        data.signals?.company_size,
          industry:            data.signals?.industry,
          sales_angle:         data.sales_angle,
        },
      })

      // Supabase realtime will also fire — deduplicate by email
      setLeads(prev => [newLead, ...prev.filter(l => l.email !== newLead.email)])
      setSelected(newLead)
      setAdding(false)
      setNewEmail(''); setNewUrl(''); setNewName(''); setNewTitle('')
    } catch {
      setScoreError('Backend not reachable. Is uvicorn running on port 8000?')
    } finally {
      setScoring(false)
    }
  }

  function closeModal() {
    setAdding(false); setScoreError('')
    setNewEmail(''); setNewUrl(''); setNewName(''); setNewTitle('')
  }

  const filtered = leads.filter(l => {
    const mf = filter === 'all' || l.status === filter
    const ms = !search
      || l.name.toLowerCase().includes(search.toLowerCase())
      || l.company.toLowerCase().includes(search.toLowerCase())
    return mf && ms
  })

  const highCount = leads.filter(l => l.status === 'high').length
  const avgScore = leads.length
    ? Math.round(leads.reduce((a, l) => a + (l.score || 0), 0) / leads.length)
    : 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', transition: 'background 0.3s ease' }}>

      <header style={{ borderBottom: '1px solid var(--border)', padding: '0 24px', display: 'flex', alignItems: 'center', height: 72, gap: 20, position: 'sticky', top: 0, background: 'var(--surface)', backdropFilter: 'blur(16px)', zIndex: 100, opacity: 0.98 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFFFFF' }}/>
          </div>
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 900, fontSize: 24, letterSpacing: '-0.04em', color: 'var(--text)' }}>SIGNAL</span>
          <span style={{ fontSize: 13, color: 'var(--muted)', letterSpacing: '0.08em', marginLeft: 2, fontWeight: 700 }}>INTELLIGENCE</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12, background: 'var(--surface2)', padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: isLive ? 'var(--accent2)' : 'var(--accent3)', boxShadow: isLive ? `0 0 6px var(--accent2)` : 'none' }}/>
            <span style={{ fontSize: 11, color: isLive ? 'var(--accent2)' : 'var(--accent3)', fontFamily: 'var(--font-head)', textTransform: 'uppercase', letterSpacing: '0.02em', fontWeight: 800 }}>
              {isLive ? 'Live' : 'Offline'}
            </span>
          </div>
          <div onClick={() => setIsSimulating(!isSimulating)} style={{ 
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
            background: isSimulating ? 'rgba(124,58,237,0.1)' : 'var(--surface2)', 
            padding: '4px 10px', borderRadius: 20, border: `1px solid ${isSimulating ? '#7C3AED' : 'var(--border)'}`,
            transition: 'all 0.2s ease'
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: isSimulating ? '#7C3AED' : 'var(--muted)', boxShadow: isSimulating ? '0 0 6px #7C3AED' : 'none' }}/>
            <span style={{ fontSize: 11, color: isSimulating ? '#7C3AED' : 'var(--muted)', fontFamily: 'var(--font-head)', textTransform: 'uppercase', letterSpacing: '0.02em', fontWeight: 800 }}>
              {isSimulating ? 'Simulating' : 'Sim Off'}
            </span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            <div className="toggle-thumb" style={{ fontSize: 16 }}>{theme === 'dark' ? '🌙' : '☀️'}</div>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..."
            style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '10px 18px', fontSize: 15, color: 'var(--text)', fontFamily: 'var(--font-head)', outline: 'none', width: 260 }}/>
          <button onClick={() => setAdding(true)} className="btn-premium" style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#FFFFFF', fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.02em', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.2)' }}>
            + Score Lead
          </button>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--surface2)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: 'var(--muted)', fontWeight: 800 }}>SA</div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '16px 24px 0' }}>
        <StatCard label="Total leads" value={leads.length} sub="in your pipeline"/>
        <StatCard label="High priority" value={highCount}    sub="require immediate action" accent="var(--status-high)"/>
        <StatCard label="Avg score"     value={avgScore}     sub="across all inbound"       accent="var(--status-high)"/>
        <StatCard label="Hours saved"   value={`${(leads.length * 0.25).toFixed(1)}h`} sub="vs manual research" accent="#7C3AED"/>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '12px 24px 0', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'All' },
          { id: 'high', label: 'High Priority' },
          { id: 'medium', label: 'Medium Priority' },
          { id: 'low', label: 'Low Priority' }
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} className="btn-premium" style={{
            padding: '5px 14px', borderRadius: 6,
            border: `1px solid ${filter === f.id ? 'var(--accent)' : 'var(--border)'}`,
            background: filter === f.id ? 'var(--surface2)' : 'var(--surface)',
            color: filter === f.id ? 'var(--accent)' : 'var(--muted)',
            fontFamily: 'var(--font-head)', fontSize: 12.5, cursor: 'pointer', letterSpacing: '0.06em',
            textTransform: 'uppercase', transition: 'all 0.15s', fontWeight: 700,
            boxShadow: filter === f.id ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
          }}>{f.label}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)', alignSelf: 'center', fontWeight: 600 }}>{filtered.length} leads</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 550px', gap: 16, padding: '16px 24px 24px', flex: 1, minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', paddingRight: 4 }}>
          {leads.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)', fontSize: 15, background: 'var(--surface)', borderRadius: 12, border: '1px dashed var(--border)' }}>
              No leads yet — click <strong style={{ color: 'var(--accent)' }}>+ Score Lead</strong> to add your first one.
            </div>
          )}
          {filtered.map((lead, i) => (
            <LeadCard key={lead.id} lead={lead} selected={selected?.id === lead.id} onClick={() => setSelected(lead)} onDelete={handleDeleteLead} index={i}/>
          ))}
          {leads.length > 0 && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>No leads match this filter.</div>
          )}
        </div>
        <div style={{ overflowY: 'auto' }}>
          {selected
            ? <DetailPane lead={selected} onEnriched={handleEnriched}/>
            : <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)', fontSize: 14 }}>Select a lead to view details.</div>
          }
        </div>
      </div>

      {adding && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(6px)' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 32, width: 440, animation: 'fadeUp 0.3s ease', boxShadow: '0 32px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 6, letterSpacing: '-0.02em' }}>Score a new lead</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
              AI researches the company and calculates a propensity score. "VP of Sales" or "CEO" titles add significant weight.
            </div>

            <InputField label="Lead email"  value={newEmail} onChange={setNewEmail} placeholder="angela@hubspot.com"  required={true}/>
            <InputField label="Company URL" value={newUrl}   onChange={setNewUrl}   placeholder="https://hubspot.com" required={true}/>
            <InputField label="Lead name"   value={newName}  onChange={setNewName}  placeholder="Angela Tan"          required={false}/>
            <InputField label="Job title"   value={newTitle} onChange={setNewTitle} placeholder="CRO"                 required={false}/>

            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: 'var(--accent)', marginBottom: scoreError ? 12 : 24, lineHeight: 1.6, fontWeight: 600 }}>
              Agent sequence: Groq (Llama 3) → Research → ICP Score → Supabase Sync
            </div>

            {scoreError && (
              <div style={{ fontSize: 11, color: 'var(--accent3)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', marginBottom: 18, fontWeight: 600 }}>
                ✗ {scoreError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={closeModal} className="btn-premium" style={{ flex: 1, padding: '12px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontFamily: 'var(--font-head)', fontSize: 13 }}>Cancel</button>
              <button onClick={handleScore} disabled={scoring} className="btn-premium" style={{ flex: 2, padding: '12px 0', borderRadius: 8, border: 'none', background: scoring ? 'var(--surface2)' : 'var(--accent)', color: scoring ? 'var(--accent)' : '#FFFFFF', fontFamily: 'var(--font-head)', fontSize: 13, fontWeight: 800, cursor: scoring ? 'default' : 'pointer', letterSpacing: '0.04em', boxShadow: scoring ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.2)' }}>
                {scoring ? '⬡ SCORING...' : 'RUN AI SCORING →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}