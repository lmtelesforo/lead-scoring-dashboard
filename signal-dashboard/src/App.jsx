import React, { useState, useEffect, useRef } from 'react'

const LEADS = [
  {
    id: 1, name: 'James Reyes', title: 'VP of Sales', company: 'Shopify', email: 'jreyes@shopify.com',
    website: 'shopify.com', score: 94, delta: +12,
    badges: ['High Intent', 'Decision Maker', 'Series C+'],
    signals: { funding: '$1.2B raised', techStack: 'Salesforce, HubSpot', hiring: '12 Sales roles open', visits: 7 },
    icp: { size: 'Enterprise', industry: 'E-commerce', fit: 98 },
    activity: 'Visited pricing page 3x this week',
    time: '4 min ago', status: 'hot'
  },
  {
    id: 2, name: 'Priya Nair', title: 'Head of RevOps', company: 'Notion', email: 'priya@notion.so',
    website: 'notion.so', score: 88, delta: +5,
    badges: ['Decision Maker', 'Competitor User', 'High Intent'],
    signals: { funding: '$275M raised', techStack: 'Pipedrive, Intercom', hiring: '8 RevOps roles open', visits: 4 },
    icp: { size: 'Mid-Market', industry: 'SaaS', fit: 91 },
    activity: 'Opened email 4x, clicked demo link',
    time: '11 min ago', status: 'hot'
  },
  {
    id: 3, name: 'Carlos Mendoza', title: 'Sales Manager', company: 'Freshworks', email: 'c.mendoza@freshworks.com',
    website: 'freshworks.com', score: 76, delta: +3,
    badges: ['Competitor User', 'Growing Team'],
    signals: { funding: '$250M raised', techStack: 'Zendesk, Slack', hiring: '5 Sales roles open', visits: 2 },
    icp: { size: 'Mid-Market', industry: 'SaaS', fit: 79 },
    activity: 'Downloaded case study PDF',
    time: '28 min ago', status: 'warm'
  },
  {
    id: 4, name: 'Sophie Leclerc', title: 'Operations Lead', company: 'Monday.com', email: 'sophie@monday.com',
    website: 'monday.com', score: 71, delta: -2,
    badges: ['Growing Team', 'Series C+'],
    signals: { funding: '$574M raised', techStack: 'Asana, Jira', hiring: '3 Ops roles open', visits: 3 },
    icp: { size: 'Enterprise', industry: 'Productivity', fit: 74 },
    activity: 'Subscribed to newsletter',
    time: '1 hr ago', status: 'warm'
  },
  {
    id: 5, name: 'Aaron Walsh', title: 'Account Executive', company: 'Asana', email: 'a.walsh@asana.com',
    website: 'asana.com', score: 58, delta: 0,
    badges: ['Early Stage'],
    signals: { funding: '$213M raised', techStack: 'Salesforce', hiring: '1 Sales role open', visits: 1 },
    icp: { size: 'SMB', industry: 'Productivity', fit: 61 },
    activity: 'Visited homepage once',
    time: '3 hr ago', status: 'cool'
  },
  {
    id: 6, name: 'Mei Lin', title: 'Marketing Director', company: 'Zoom', email: 'mei.lin@zoom.us',
    website: 'zoom.us', score: 43, delta: -8,
    badges: ['Wrong Persona'],
    signals: { funding: 'Public (NASDAQ)', techStack: 'Marketo, HubSpot', hiring: '0 Sales roles open', visits: 1 },
    icp: { size: 'Enterprise', industry: 'Communications', fit: 45 },
    activity: 'Bounced from landing page',
    time: '5 hr ago', status: 'cold'
  },
]

const BADGE_COLORS = {
  'High Intent': { bg: 'rgba(232,255,71,0.12)', color: '#e8ff47', border: 'rgba(232,255,71,0.3)' },
  'Decision Maker': { bg: 'rgba(71,255,204,0.10)', color: '#47ffcc', border: 'rgba(71,255,204,0.25)' },
  'Competitor User': { bg: 'rgba(255,107,107,0.10)', color: '#ff8f8f', border: 'rgba(255,107,107,0.25)' },
  'Series C+': { bg: 'rgba(160,120,255,0.10)', color: '#c4a3ff', border: 'rgba(160,120,255,0.25)' },
  'Growing Team': { bg: 'rgba(255,170,43,0.10)', color: '#ffaa2b', border: 'rgba(255,170,43,0.25)' },
  'Early Stage': { bg: 'rgba(100,100,120,0.15)', color: '#9999aa', border: 'rgba(100,100,120,0.2)' },
  'Wrong Persona': { bg: 'rgba(255,60,60,0.08)', color: '#ff6b6b', border: 'rgba(255,60,60,0.2)' },
}

function ScoreRing({ score, size = 56 }) {
  const r = (size / 2) - 5
  const circ = 2 * Math.PI * r
  const pct = score / 100
  const color = score >= 80 ? '#e8ff47' : score >= 60 ? '#ffaa2b' : '#ff6b6b'
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }}/>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="13" fontWeight="600" fontFamily="DM Mono, monospace"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}>
        {score}
      </text>
    </svg>
  )
}

function Badge({ label }) {
  const s = BADGE_COLORS[label] || { bg: '#222', color: '#aaa', border: '#333' }
  return (
    <span style={{
      fontSize: 10, fontFamily: 'DM Mono, monospace', fontWeight: 500,
      padding: '2px 8px', borderRadius: 3,
      background: s.bg, color: s.color,
      border: `0.5px solid ${s.border}`,
      letterSpacing: '0.04em', whiteSpace: 'nowrap'
    }}>{label}</span>
  )
}

function StatusDot({ status }) {
  const colors = { hot: '#e8ff47', warm: '#ffaa2b', cool: '#47b8ff', cold: '#6b6b7a' }
  const c = colors[status] || '#6b6b7a'
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: c, flexShrink: 0,
      boxShadow: status === 'hot' ? `0 0 6px ${c}` : 'none',
      animation: status === 'hot' ? 'pulse-ring 2s infinite' : 'none'
    }}/>
  )
}

function ScanLine() {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: '30%',
      background: 'linear-gradient(to bottom, transparent, rgba(232,255,71,0.03), transparent)',
      animation: 'scan 4s linear infinite', pointerEvents: 'none', zIndex: 0
    }}/>
  )
}

function LeadCard({ lead, selected, onClick, index }) {
  const scoreColor = lead.score >= 80 ? '#e8ff47' : lead.score >= 60 ? '#ffaa2b' : '#ff6b6b'
  return (
    <div onClick={onClick} style={{
      background: selected ? 'rgba(232,255,71,0.04)' : 'var(--surface)',
      border: `0.5px solid ${selected ? 'rgba(232,255,71,0.25)' : 'var(--border)'}`,
      borderRadius: 8, padding: '14px 16px', cursor: 'pointer',
      transition: 'all 0.18s ease',
      animation: `fadeUp 0.4s ease both`,
      animationDelay: `${index * 0.06}s`,
      position: 'relative', overflow: 'hidden',
    }}>
      {selected && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: '#e8ff47', borderRadius: '2px 0 0 2px' }}/>}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <ScoreRing score={lead.score} size={50}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <StatusDot status={lead.status}/>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#f0f0f5' }}>{lead.name}</span>
            <span style={{ fontSize: 10, color: lead.delta > 0 ? '#47ffcc' : lead.delta < 0 ? '#ff6b6b' : '#6b6b7a', marginLeft: 'auto', flexShrink: 0 }}>
              {lead.delta > 0 ? `▲ +${lead.delta}` : lead.delta < 0 ? `▼ ${lead.delta}` : '— 0'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
            {lead.title} · <span style={{ color: '#a0a0b5' }}>{lead.company}</span>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {lead.badges.map(b => <Badge key={b} label={b}/>)}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '0.5px solid var(--border)', fontSize: 10, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontStyle: 'italic' }}>{lead.activity}</span>
        <span>{lead.time}</span>
      </div>
    </div>
  )
}

function SignalBar({ label, value, max = 100 }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 10, color: 'var(--muted)' }}>
        <span>{label}</span><span style={{ color: '#e8ff47' }}>{value}</span>
      </div>
      <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }}>
        <div style={{ height: 2, width: `${value}%`, background: 'linear-gradient(90deg, #47ffcc, #e8ff47)', borderRadius: 1, transition: 'width 0.8s ease' }}/>
      </div>
    </div>
  )
}

function DetailPane({ lead }) {
  const [scanning, setScanning] = useState(false)
  const [enriched, setEnriched] = useState(false)

  function runEnrich() {
    setScanning(true)
    setTimeout(() => { setScanning(false); setEnriched(true) }, 2200)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeUp 0.3s ease' }}>
      <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 8, padding: 18, position: 'relative', overflow: 'hidden' }}>
        <ScanLine/>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--surface2)', border: '0.5px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne', fontWeight: 800, fontSize: 18, color: '#e8ff47' }}>
              {lead.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: '#f0f0f5' }}>{lead.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{lead.title} · {lead.company}</div>
              <div style={{ fontSize: 10, color: '#47ffcc', marginTop: 2 }}>{lead.email}</div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <ScoreRing score={lead.score} size={64}/>
              <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 4, textAlign: 'center' }}>propensity</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 14 }}>
            {lead.badges.map(b => <Badge key={b} label={b}/>)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: 5, borderLeft: '2px solid rgba(232,255,71,0.3)' }}>
            {lead.activity}
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 8, padding: 18 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: 14, textTransform: 'uppercase' }}>ICP Fit Breakdown</div>
        <SignalBar label="Overall ICP score" value={lead.icp.fit}/>
        <SignalBar label="Company size match" value={lead.score - 5 > 0 ? lead.score - 5 : lead.score}/>
        <SignalBar label="Industry alignment" value={Math.min(lead.score + 3, 99)}/>
        <SignalBar label="Tech stack overlap" value={Math.max(lead.score - 15, 20)}/>
        <SignalBar label="Buying signals" value={lead.signals.visits * 13}/>
      </div>

      <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 8, padding: 18 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: 12, textTransform: 'uppercase' }}>AI Enrichment Signals</div>
        {[
          ['Funding', lead.signals.funding],
          ['Tech stack', lead.signals.techStack],
          ['Open roles', lead.signals.hiring],
          ['Page visits', `${lead.signals.visits}x this week`],
          ['Company size', lead.icp.size],
          ['Industry', lead.icp.industry],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '0.5px solid var(--border)', fontSize: 11 }}>
            <span style={{ color: 'var(--muted)' }}>{k}</span>
            <span style={{ color: '#f0f0f5', fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 8, padding: 18 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: 12, textTransform: 'uppercase' }}>AI Recommended Action</div>
        <div style={{ fontSize: 12, color: '#f0f0f5', lineHeight: 1.7, marginBottom: 14 }}>
          {lead.score >= 80
            ? `High-priority outreach. ${lead.name} shows strong buying intent — ${lead.signals.hiring} suggests budget. Lead with ROI angle. Ping within 30 min.`
            : lead.score >= 60
            ? `Nurture sequence recommended. ${lead.name} is engaged but not ready. Enroll in 5-touch email drip. Re-score in 7 days.`
            : `Low priority. ${lead.name} shows weak signals. Add to newsletter list. Do not assign to a rep yet.`}
        </div>
        <button
          onClick={runEnrich}
          disabled={scanning}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 5, border: 'none',
            background: scanning ? 'rgba(232,255,71,0.08)' : '#e8ff47',
            color: scanning ? '#e8ff47' : '#0a0a0f',
            fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 500,
            cursor: scanning ? 'default' : 'pointer', letterSpacing: '0.05em',
            transition: 'all 0.2s ease',
          }}>
          {scanning ? '⬡ ENRICHING...' : enriched ? '✓ ENRICHMENT COMPLETE' : '⬡ RUN AI ENRICHMENT'}
        </button>
        {enriched && (
          <div style={{ marginTop: 10, fontSize: 10, color: '#47ffcc', background: 'rgba(71,255,204,0.06)', padding: '8px 10px', borderRadius: 5, border: '0.5px solid rgba(71,255,204,0.15)', animation: 'fadeUp 0.3s ease' }}>
            ✓ Groq API called · Company researched · Score updated · HubSpot synced
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '16px 18px' }}>
      <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, color: accent || '#f0f0f5', letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function App() {
  const [selected, setSelected] = useState(LEADS[0])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [scoring, setScoring] = useState(false)

  const filtered = LEADS.filter(l => {
    const matchFilter = filter === 'all' || l.status === filter
    const matchSearch = search === '' || l.name.toLowerCase().includes(search.toLowerCase()) || l.company.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  function handleScore() {
    if (!newEmail || !newUrl) return
    setScoring(true)
    setTimeout(() => { setScoring(false); setAdding(false); setNewEmail(''); setNewUrl('') }, 2500)
  }

  const hotCount = LEADS.filter(l => l.status === 'hot').length
  const avgScore = Math.round(LEADS.reduce((a, l) => a + l.score, 0) / LEADS.length)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '0.5px solid var(--border)', padding: '0 24px', display: 'flex', alignItems: 'center', height: 52, gap: 16, position: 'sticky', top: 0, background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(8px)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 22, height: 22, background: '#e8ff47', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0a0a0f' }}/>
          </div>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', color: '#f0f0f5' }}>SIGNAL</span>
          <span style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', marginLeft: 2 }}>LEAD INTELLIGENCE</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="search leads..."
            style={{ background: 'var(--surface)', border: '0.5px solid var(--border2)', borderRadius: 5, padding: '5px 12px', fontSize: 11, color: '#f0f0f5', fontFamily: 'DM Mono', outline: 'none', width: 180 }}/>
          <button onClick={() => setAdding(true)} style={{
            padding: '6px 14px', borderRadius: 5, border: 'none',
            background: '#e8ff47', color: '#0a0a0f',
            fontFamily: 'DM Mono', fontSize: 11, fontWeight: 500, cursor: 'pointer', letterSpacing: '0.04em'
          }}>+ Score Lead</button>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface2)', border: '0.5px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--muted)' }}>SA</div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '16px 24px 0' }}>
        <StatCard label="Leads today" value={LEADS.length} sub="↑ 3 from yesterday"/>
        <StatCard label="Hot leads" value={hotCount} sub="require immediate action" accent="#e8ff47"/>
        <StatCard label="Avg score" value={avgScore} sub="across all inbound" accent="#47ffcc"/>
        <StatCard label="Hours saved" value="2.1h" sub="vs manual research today" accent="#c4a3ff"/>
      </div>

      <div style={{ display: 'flex', gap: 6, padding: '12px 24px 0', flexWrap: 'wrap' }}>
        {['all', 'hot', 'warm', 'cool', 'cold'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '4px 12px', borderRadius: 4, border: `0.5px solid ${filter === f ? '#e8ff47' : 'var(--border)'}`,
            background: filter === f ? 'rgba(232,255,71,0.08)' : 'transparent',
            color: filter === f ? '#e8ff47' : 'var(--muted)',
            fontFamily: 'DM Mono', fontSize: 10, cursor: 'pointer', letterSpacing: '0.06em',
            textTransform: 'uppercase', transition: 'all 0.15s'
          }}>{f}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--muted)', alignSelf: 'center' }}>{filtered.length} leads</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 12, padding: '12px 24px 24px', flex: 1, minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
          {filtered.map((lead, i) => (
            <LeadCard key={lead.id} lead={lead} selected={selected?.id === lead.id} onClick={() => setSelected(lead)} index={i}/>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 12 }}>No leads match this filter.</div>
          )}
        </div>
        <div style={{ overflowY: 'auto' }}>
          {selected && <DetailPane lead={selected}/>}
        </div>
      </div>

      {adding && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border2)', borderRadius: 10, padding: 28, width: 380, animation: 'fadeUp 0.25s ease' }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Score a new lead</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 20 }}>Paste a lead email and company URL. The AI agent will research and score them.</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Lead email</div>
              <input value={newEmail} onChange={e => setNewEmail(e.target.value)}
                placeholder="james@company.com"
                style={{ width: '100%', background: 'var(--surface2)', border: '0.5px solid var(--border2)', borderRadius: 5, padding: '9px 12px', fontSize: 12, color: '#f0f0f5', fontFamily: 'DM Mono', outline: 'none' }}/>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 5, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Company URL</div>
              <input value={newUrl} onChange={e => setNewUrl(e.target.value)}
                placeholder="https://company.com"
                style={{ width: '100%', background: 'var(--surface2)', border: '0.5px solid var(--border2)', borderRadius: 5, padding: '9px 12px', fontSize: 12, color: '#f0f0f5', fontFamily: 'DM Mono', outline: 'none' }}/>
            </div>
            <div style={{ background: 'rgba(232,255,71,0.05)', border: '0.5px solid rgba(232,255,71,0.15)', borderRadius: 5, padding: '8px 12px', fontSize: 10, color: '#e8ff47', marginBottom: 18, lineHeight: 1.6 }}>
              Agent will call: Groq API → web search → ICP scoring → Supabase write
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setAdding(false)} style={{ flex: 1, padding: '9px 0', borderRadius: 5, border: '0.5px solid var(--border2)', background: 'transparent', color: 'var(--muted)', fontFamily: 'DM Mono', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleScore} disabled={scoring} style={{ flex: 2, padding: '9px 0', borderRadius: 5, border: 'none', background: scoring ? 'rgba(232,255,71,0.15)' : '#e8ff47', color: scoring ? '#e8ff47' : '#0a0a0f', fontFamily: 'DM Mono', fontSize: 11, fontWeight: 500, cursor: scoring ? 'default' : 'pointer', letterSpacing: '0.04em' }}>
                {scoring ? '⬡ SCORING...' : 'RUN AI SCORING →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
