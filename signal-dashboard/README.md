# Signal — Lead Intelligence Dashboard
### Project 2 of 10 · Sales Admin Portfolio

A full-stack lead scoring dashboard that uses AI to rank inbound leads by their likelihood to convert, so sales reps stop wasting time on tire kickers.

---

## What It Does

1. Sales rep pastes a lead's email + company URL
2. The AI agent researches the company (funding, tech stack, hiring signals, competitors)
3. A propensity score (0–100) is calculated against your Ideal Customer Profile
4. AI badges are assigned (High Intent, Decision Maker, Competitor User, etc.)
5. A recommended action is generated (outreach now / nurture / disqualify)
6. Everything is saved to Supabase and displayed on the dashboard

---

## Tech Stack

| Layer | Tool | Cost |
|---|---|---|
| Frontend | React + Vite | Free |
| Styling | Pure CSS (no Tailwind needed) | Free |
| Backend | FastAPI (Python) | Free |
| AI / LLM | Groq API (Llama 3-70B) | Free tier |
| Database | Supabase (Postgres) | Free tier |
| Hosting (frontend) | Vercel or Netlify | Free |
| Hosting (backend) | Render.com or Railway | Free tier |

**Total monthly cost: $0**

---

## Project Structure

```
signal-dashboard/
├── index.html
├── vite.config.js
├── package.json
├── src/
│   ├── main.jsx          ← React entry point
│   ├── App.jsx           ← Main dashboard component
│   └── index.css         ← Global styles
└── backend/
    ├── main.py           ← FastAPI server (scoring engine)
    ├── schema.sql        ← Supabase database schema
    ├── requirements.txt  ← Python dependencies
    └── .env.example      ← Environment variables template
```

---

## Setup Guide

### Step 1 — Supabase Database (10 min)

1. Go to [supabase.com](https://supabase.com) → New Project
2. Name it `signal-dashboard`
3. Go to **SQL Editor** → New Query
4. Paste the entire contents of `backend/schema.sql` → Run
5. Go to **Settings → API** → copy:
   - Project URL → `SUPABASE_URL`
   - Anon public key → `SUPABASE_ANON_KEY`

### Step 2 — Backend Setup (10 min)

```bash
cd backend
cp .env.example .env
# Fill in your GROQ_API_KEY and Supabase credentials in .env

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Visit `http://localhost:8000/docs` — you'll see the interactive API docs (FastAPI auto-generates these).

Test it:
```bash
curl -X POST http://localhost:8000/score-lead \
  -H "Content-Type: application/json" \
  -d '{"email":"test@shopify.com","company_url":"https://shopify.com","lead_name":"James","lead_title":"VP of Sales"}'
```

### Step 3 — Frontend Setup (5 min)

```bash
# From the root signal-dashboard/ folder
npm install
npm run dev
```

Visit `http://localhost:5173` — the dashboard loads with sample lead data.

To connect the frontend to your live backend, update the API URL in `src/App.jsx`:
```javascript
// Change this line in the handleScore function:
const res = await fetch('http://localhost:8000/score-lead', { ... })
```

### Step 4 — Deploy (15 min)

**Frontend → Vercel:**
```bash
npm install -g vercel
vercel --prod
```

**Backend → Render.com:**
1. Push your `backend/` folder to a GitHub repo
2. Go to render.com → New Web Service → connect repo
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port 10000`
5. Add environment variables from your `.env` file

---

## ICP Scoring Breakdown

The scoring algorithm awards points across 5 dimensions:

| Signal | Max Points | How It's Measured |
|---|---|---|
| Decision maker title | 25 pts | VP, Director, Head of, CRO, CEO in job title |
| Funding stage | 20 pts | Series C+ = 20pts, Series A/B = 12pts |
| Tech stack overlap | 20 pts | Uses tools your product integrates with |
| Hiring signals | 15 pts | Open sales/revenue/growth roles = budget signal |
| Industry fit | 15 pts | Matches ICP industry list |
| **Total** | **95 pts** | Score capped at 99 |

### Score interpretation:
- **80–99** = Hot 🔴 → Assign to rep immediately
- **60–79** = Warm 🟠 → Enroll in nurture sequence
- **40–59** = Cool 🔵 → Newsletter only
- **0–39** = Cold ⬛ → Do not work

---

## AI Badges

| Badge | Trigger |
|---|---|
| High Intent | Score ≥ 70 |
| Decision Maker | Title contains VP/Director/Head/CRO/CEO |
| Competitor User | Tech stack contains 2+ tools from ICP list |
| Series C+ | Funding at Series C or above |
| Growing Team | Open sales/revenue/growth roles found |
| Early Stage | Series A or B funding |
| Wrong Persona | No matching signals |

---

## Customizing Your ICP

Edit the `ICP` dict in `backend/main.py`:

```python
ICP = {
    "ideal_size": ["Mid-Market", "Enterprise"],
    "ideal_industries": ["SaaS", "E-commerce", "FinTech"],
    "ideal_titles": ["VP", "Director", "Head of", "CRO"],
    "tech_stack_fit": ["Salesforce", "HubSpot", "Pipedrive"],
    "funding_stages": ["Series B", "Series C", "Series D", "Public"],
}
```

---

## Portfolio Presentation

**Resume bullet:**
> "Built a full-stack AI lead scoring dashboard (React + FastAPI + Groq + Supabase) that ranks inbound leads 0–100 against ICP criteria, assigns AI intelligence badges, and generates rep action recommendations — replacing 15 min of manual research per lead."

**Key talking points:**
1. "The scoring model is fully customizable — you just edit the ICP dict to match any client's ideal customer profile."
2. "It uses Groq's free Llama 3 API so there's zero AI cost at scale."
3. "The FastAPI backend auto-generates interactive API docs — I can show the Sales Ops Manager the API live in the interview."
4. "Supabase gives us a full Postgres database with auto-generated REST APIs and Row Level Security out of the box."

---

*Signal Dashboard · Project 2 of 10 · Sales Admin AI Portfolio*
*All tools used are free tier. Total build time: ~4 hours.*
