"""
Signal — Lead Scoring API
FastAPI + Groq (free) + Supabase (free tier)

Install: pip install fastapi uvicorn groq supabase python-dotenv httpx
Run:     uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from supabase import create_client
from dotenv import load_dotenv
import os, json, httpx, re
from datetime import datetime

load_dotenv()

app = FastAPI(title="Signal Lead Scoring API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Lock this down in production
    allow_methods=["*"],
    allow_headers=["*"],
)

groq_client = Groq(api_key=os.environ["GROQ_API_KEY"])

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_ANON_KEY"]
)

# ── Models ────────────────────────────────────────────────────────────────────

class LeadInput(BaseModel):
    email: str
    company_url: str
    lead_name: str = ""
    lead_title: str = ""

class ScoreResponse(BaseModel):
    score: int
    badges: list[str]
    company_overview: str
    top_competitors: list[str]
    estimated_revenue: str
    business_goals: list[str]
    sales_angle: str
    recommended_action: str
    signals: dict

# ── ICP Definition (edit this to match your client's ideal customer) ──────────

ICP = {
    "ideal_size": ["Mid-Market", "Enterprise"],
    "ideal_industries": ["SaaS", "E-commerce", "FinTech", "HR Tech"],
    "ideal_titles": ["VP", "Director", "Head of", "CRO", "RevOps", "Sales Manager"],
    "tech_stack_fit": ["Salesforce", "HubSpot", "Pipedrive", "Outreach", "Gong"],
    "funding_stages": ["Series A", "Series B", "Series C", "Series D", "Public"],
}

# ── Scoring Logic ─────────────────────────────────────────────────────────────

def calculate_score(research: dict, lead_title: str) -> tuple[int, list[str]]:
    badges = []
    title_lower = lead_title.lower()

    # ── Title Tier: base score from seniority ─────────────────────────────────
    if any(k in title_lower for k in ["cro", "ceo", "cto", "cmo", "chief"]):
        title_base = 88
        badges.append("Decision Maker")
    elif any(k in title_lower for k in ["vp", "vice president"]):
        title_base = 83
        badges.append("Decision Maker")
    elif any(k in title_lower for k in ["head of", "director"]):
        title_base = 77
        badges.append("Decision Maker")
    elif any(k in title_lower for k in ["manager", "lead", "principal"]):
        title_base = 71
        badges.append("Decision Maker")
    elif any(k in title_lower for k in ["founder", "owner", "partner"]):
        title_base = 80
        badges.append("Decision Maker")
    elif any(k in title_lower for k in ["intern", "student", "trainee", "assistant"]):
        title_base = 40
    else:
        title_base = 50

    is_decision_maker = title_base >= 70

    # ── Company Tier: modifier from revenue & size ────────────────────────────
    funding = research.get("estimated_revenue", "").lower()
    size = research.get("company_size", "").lower()

    revenue_b = re.search(r'\$[\d.]+\s*b', funding)
    revenue_m = re.search(r'\$[\d.]+\s*m', funding)
    revenue_val = 0
    if revenue_b:
        revenue_val = float(re.search(r'[\d.]+', revenue_b.group()).group()) * 1000
    elif revenue_m:
        revenue_val = float(re.search(r'[\d.]+', revenue_m.group()).group())

    is_public = any(k in funding for k in ["public", "ipo", "nasdaq", "nyse", "listed"])

    if is_public or revenue_val >= 1000:
        company_bonus = 5   # e.g. Shopify, HubSpot, Stripe, Zendesk
        badges.append("Series C+")
        badges.append("Enterprise")
    elif revenue_val >= 200 or "enterprise" in size:
        company_bonus = 3   # e.g. Notion, Canva, Freshworks
        badges.append("Series C+")
        badges.append("Enterprise")
    elif revenue_val >= 50 or any(k in funding for k in ["series c", "series d"]):
        company_bonus = 1
        badges.append("Series C+")
    elif revenue_val >= 10 or any(k in funding for k in ["series a", "series b"]):
        company_bonus = 0
        badges.append("Growth Stage")
    else:
        company_bonus = -5

    # ── Signal Bonuses (max 1 pt per category = 3 total) ─────────────────────
    signal_bonus = 0

    # Industry fit
    industry = research.get("industry", "").lower()
    ideal_lower = ["saas", "e-commerce", "ecommerce", "fintech", "hr tech", "hrtech", "b2b", "marketplace", "software", "platform"]
    if any(i in industry for i in ideal_lower):
        signal_bonus += 1
        badges.append("ICP Match")

    # Hiring signals
    hiring = research.get("open_roles", "").lower()
    if any(k in hiring for k in ["sales", "revenue", "growth", "go-to-market", "gtm", "sdr", "bdr", "account executive"]):
        signal_bonus += 1
        badges.append("Growing Team")
    elif any(k in hiring for k in ["hiring", "expanding", "recruiting"]):
        signal_bonus += 1

    # Tech stack overlap
    tech = research.get("tech_stack", "").lower()
    overlap = [t for t in ICP["tech_stack_fit"] if t.lower() in tech]
    if len(overlap) >= 2:
        signal_bonus += 1
        badges.append("Competitor User")
    elif len(overlap) == 1:
        signal_bonus += 1

    # ── Final Score ────────────────────────────────────────────────────────────
    final_score = title_base + company_bonus + signal_bonus

    if final_score >= 80:
        badges.append("High Intent")

    return min(max(final_score, 0), 100), badges


def get_recommended_action(score: int, name: str) -> str:
    if score >= 80:
        return f"HIGH PRIORITY: Assign to senior rep immediately. {name} shows strong buying signals. Personalize outreach with ROI data. Target response within 30 minutes."
    elif score >= 60:
        return f"NURTURE: Enroll {name} in a 5-touch email sequence. Re-score in 7 days. Do not assign a rep yet."
    else:
        return f"LOW PRIORITY: Add {name} to newsletter list only. Do not assign rep time. Re-evaluate if behavior changes."


# ── Main Scoring Endpoint ──────────────────────────────────────────────────────

@app.post("/score-lead", response_model=ScoreResponse)
async def score_lead(lead: LeadInput):
    """
    Takes a lead email + company URL, calls Groq AI to research the company,
    calculates a propensity score, assigns AI badges, and saves to Supabase.
    """

    # ── Step 1: Call Groq to research the company ──────────────────────────
    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=800,
            messages=[
                {
                    "role": "system",
                    "content": """You are a B2B sales intelligence agent. Research a company and return ONLY valid JSON.
No preamble, no markdown. Return this exact structure:
{
  "company_overview": "2-sentence description",
  "top_competitors": ["Competitor1", "Competitor2", "Competitor3"],
  "estimated_revenue": "e.g. $7.1B ARR or 'Public company - $7.1B ARR'",
  "industry": "e.g. SaaS, E-commerce, FinTech",
  "company_size": "SMB | Mid-Market | Enterprise",
  "tech_stack": "Known tools they use, comma separated",
  "open_roles": "Brief description of hiring signals (e.g. actively hiring sales, growth, and revenue roles)",
  "business_goals_2026": ["Goal 1", "Goal 2", "Goal 3"],
  "sales_angle": "One sentence on why our B2B SaaS tool helps them now",
  "ai_score": 85
}
The ai_score is YOUR holistic assessment (0-100) of this company as a B2B SaaS sales prospect, based on: company size, growth trajectory, budget, decision-making power, and strategic fit. Be honest but optimistic for high-growth companies."""
                },
                {
                    "role": "user",
                    "content": f"Research this company: {lead.company_url}"
                }
            ]
        )

        raw = completion.choices[0].message.content.strip()

        # Strip markdown fences if Groq adds them
        raw = re.sub(r"```json|```", "", raw).strip()
        research = json.loads(raw)

    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="AI returned malformed JSON. Try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Groq API error: {str(e)}")

    # ── Step 2: Calculate score + badges ──────────────────────────────────
    score, badges = calculate_score(research, lead.lead_title)
    recommended_action = get_recommended_action(score, lead.lead_name or "This lead")

    # ── Step 3: Save to Supabase ───────────────────────────────────────────
    try:
        supabase.table("leads").insert({
            "email": lead.email,
            "company_url": lead.company_url,
            "lead_name": lead.lead_name,
            "lead_title": lead.lead_title,
            "score": score,
            "badges": badges,
            "research": research,
            "created_at": datetime.utcnow().isoformat(),
        }).execute()
    except Exception as e:
        # Don't fail the request if Supabase write fails — just log it
        print(f"Supabase write failed: {e}")

    # ── Step 4: Return full response ────────────────────────────────────────
    return ScoreResponse(
        score=score,
        badges=badges,
        company_overview=research.get("company_overview", ""),
        top_competitors=research.get("top_competitors", []),
        estimated_revenue=research.get("estimated_revenue", ""),
        business_goals=research.get("business_goals_2026", []),
        sales_angle=research.get("sales_angle", ""),
        recommended_action=recommended_action,
        signals={
            "tech_stack": research.get("tech_stack", ""),
            "open_roles": research.get("open_roles", ""),
            "industry": research.get("industry", ""),
            "company_size": research.get("company_size", ""),
        }
    )


@app.get("/leads")
async def get_leads(limit: int = 50):
    """Fetch all scored leads from Supabase, most recent first."""
    try:
        result = supabase.table("leads").select("*").order("created_at", desc=True).limit(limit).execute()
        return {"leads": result.data, "count": len(result.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
