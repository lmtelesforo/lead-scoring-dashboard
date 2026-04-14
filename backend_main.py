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
    score = 0
    badges = []

    # Title match (0-25 pts)
    title_lower = lead_title.lower()
    decision_maker_keywords = ["vp", "vice president", "director", "head of", "cro", "ceo", "founder", "owner", "manager"]
    if any(k in title_lower for k in decision_maker_keywords):
        score += 25
        badges.append("Decision Maker")

    # Funding signal (0-20 pts)
    funding = research.get("estimated_revenue", "").lower()
    if any(stage.lower() in funding for stage in ["series c", "series d", "public", "ipo"]):
        score += 20
        badges.append("Series C+")
    elif any(stage.lower() in funding for stage in ["series a", "series b"]):
        score += 12
        badges.append("Early Stage")

    # Tech stack overlap (0-20 pts)
    tech = research.get("tech_stack", "").lower()
    overlap = [t for t in ICP["tech_stack_fit"] if t.lower() in tech]
    if len(overlap) >= 2:
        score += 20
        badges.append("Competitor User")
    elif len(overlap) == 1:
        score += 10

    # Hiring signals (0-20 pts)
    hiring = research.get("open_roles", "").lower()
    if "sales" in hiring or "revenue" in hiring or "growth" in hiring:
        score += 15
        badges.append("Growing Team")

    # Industry fit (0-15 pts)
    industry = research.get("industry", "").lower()
    if any(i.lower() in industry for i in ICP["ideal_industries"]):
        score += 15

    # Intent signals — bonus points
    if score >= 70:
        badges.append("High Intent")

    # Cap at 99
    score = min(score, 99)

    return score, badges


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
  "estimated_revenue": "e.g. $10M-$50M ARR",
  "industry": "e.g. SaaS",
  "company_size": "SMB | Mid-Market | Enterprise",
  "tech_stack": "Known tools they use, comma separated",
  "open_roles": "Brief description of hiring signals",
  "business_goals_2026": ["Goal 1", "Goal 2", "Goal 3"],
  "sales_angle": "One sentence on why our B2B SaaS tool helps them now"
}"""
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
