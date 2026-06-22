"""
LunaFemCare – FastAPI Backend
Phase 3: Supabase Auth & Data Persistence
Wraps the Phase 1 trained ML models (luna_pipeline.pkl, tfidf_vectorizer.pkl,
food_tfidf_matrix.pkl, food_database.parquet, luna_config.json) in a REST API.
Adds Supabase-backed auth, profile management, daily log persistence, and
AI recommendation storage.
"""

import os
import re
import json
import math
import logging
from datetime import date
from pathlib import Path
from typing import List, Optional, Any, Dict

import joblib
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import create_client, Client

# ─── Env & Logging ───────────────────────────────────────────────────────────
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

logging.basicConfig(level=logging.WARNING, format="%(levelname)s  %(message)s")

logger = logging.getLogger("luna")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.warning("SUPABASE_URL or SUPABASE_KEY not set – Supabase routes will fail.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).resolve().parent.parent   # …/LunaFemCare/
MODELS_DIR = BASE_DIR / "ml" / "models"

# ─── Load ML artefacts at startup ─────────────────────────────────────────────
logger.info("Loading ML artefacts from %s", MODELS_DIR)

pipeline: dict        = joblib.load(MODELS_DIR / "luna_pipeline.pkl")
tfidf_vectorizer      = joblib.load(MODELS_DIR / "tfidf_vectorizer.pkl")
food_tfidf_matrix     = joblib.load(MODELS_DIR / "food_tfidf_matrix.pkl")
food_db: pd.DataFrame = pd.read_parquet(MODELS_DIR / "food_database.parquet")

with open(MODELS_DIR / "luna_config.json", encoding="utf-8") as f:
    cfg: dict = json.load(f)

with open(MODELS_DIR / "top_foods_index.json", encoding="utf-8") as f:
    top_foods_index: dict = json.load(f)

with open(MODELS_DIR / "food_mapping.json", encoding="utf-8") as f:
    food_mapping_dict = json.load(f)

scaler          = pipeline.get("scaler")
NUTRIENT_COLS   = cfg["nutrient_cols"]
NORM_COLS       = cfg["norm_cols"]
UNIT_TO_GRAMS   = cfg["unit_to_grams"]
PHASE_MULT      = cfg["phase_multipliers"]
SYMPTOM_MAP     = cfg["symptom_nutrient_map"]
BASELINE_NORMAL = cfg["baseline_normal"]
BASELINE_PREG   = cfg["baseline_pregnant"]
DEF_THRESHOLD   = cfg["deficiency_threshold"]
TOP_K           = cfg["top_k_suggestions"]

VALID_PHASES = set(PHASE_MULT.keys())

logger.info("All ML artefacts loaded successfully ✓")

# ─── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="LunaFemCare API",
    description="AI-driven nutritional analysis and cycle-phase recommendations for women.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    # Allows: localhost dev, any *.vercel.app preview/prod URL, custom domain
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://[a-zA-Z0-9\-]+\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    passkey: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    age: Optional[int] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    health_flags: Optional[Dict[str, Any]] = Field(default_factory=dict)
    cycle_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    is_pregnant: bool = False
    marital_status: Optional[str] = "Single"
    pregnancy_planning: Optional[str] = None
    children_count: Optional[int] = 0
    children_details: Optional[List[Dict[str, Any]]] = Field(default_factory=list)


class ProfileUpdateRequest(BaseModel):
    """Used by onboarding to persist collected profile data to the backend."""
    name: Optional[str] = None
    age: Optional[int] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    health_flags: Optional[Dict[str, Any]] = None
    cycle_metadata: Optional[Dict[str, Any]] = None
    is_pregnant: Optional[bool] = None
    marital_status: Optional[str] = None
    pregnancy_planning: Optional[str] = None
    children_count: Optional[int] = None
    children_details: Optional[List[Dict[str, Any]]] = None
    pregnancy_week: Optional[str] = None
    expected_due_date: Optional[str] = None
    pregnancy_complications: Optional[str] = None


class LoginRequest(BaseModel):
    passkey: str = Field(..., min_length=1)


class ProfileResponse(BaseModel):
    id: str
    name: str
    age: Optional[int]
    weight: Optional[float]
    height: Optional[float]
    health_flags: Optional[Dict[str, Any]]
    cycle_metadata: Optional[Dict[str, Any]]
    is_pregnant: bool
    marital_status: Optional[str]
    pregnancy_planning: Optional[str]
    children_count: Optional[int]
    children_details: Optional[List[Dict[str, Any]]]
    role: str
    passkey: str


class DailyLogRequest(BaseModel):
    user_id: str
    log_date: Optional[str] = None  # ISO date string, defaults to today
    symptoms: Optional[Dict[str, Any]] = Field(default_factory=dict)
    food_intake: Optional[List[Any]] = Field(default_factory=list)
    nutri_score: Optional[int] = 0


class MarkMenstruationRequest(BaseModel):
    user_id: str
    log_date: str
    is_menstruating: bool


class SaveRecommendationRequest(BaseModel):
    user_id: str
    date: Optional[str] = None
    ai_suggestions: str
    risk_level: str = "low"


class FoodItem(BaseModel):
    description: str = Field(..., json_schema_extra={"example": "100g poha"})


class ProcessFoodRequest(BaseModel):
    food_items: List[FoodItem]


class NutrientVector(BaseModel):
    Energy_kcal: float
    Protein_g: float
    Fat_g: float
    Carbs_g: float
    Fiber_g: float
    Iron_mg: float
    Calcium_mg: float
    Vit_A_mcg: float
    Sodium_mg: float


class ProcessFoodResponse(BaseModel):
    status: str
    parsed_items: List[dict]
    total_nutrients: NutrientVector
    message: str


class RecommendationRequest(BaseModel):
    nutrient_vector: NutrientVector
    phase: str = Field(..., json_schema_extra={"example": "Menstrual"})
    is_pregnant: bool = Field(False)
    symptoms: Optional[List[str]] = Field(default=[])


class RecommendationResponse(BaseModel):
    status: str
    phase: str
    is_pregnant: bool
    daily_targets: dict
    deficiencies: List[dict]
    surpluses: List[dict]
    food_suggestions: List[dict]
    symptom_insights: List[dict]
    overall_score: float
    message: str


# ─── ML Helpers ───────────────────────────────────────────────────────────────

_QTY_UNIT_RE = re.compile(
    r"(?P<qty>[\d]+(?:\.\d+)?)\s*(?P<unit>" + "|".join(sorted(UNIT_TO_GRAMS.keys(), key=len, reverse=True)) + r")?",
    re.IGNORECASE,
)


def _parse_single_item(description: str) -> dict:
    desc_lower = description.strip().lower()
    qty_grams = 100.0
    m = _QTY_UNIT_RE.search(desc_lower)
    if m:
        qty  = float(m.group("qty"))
        unit = (m.group("unit") or "g").lower().strip()
        qty_grams = qty * UNIT_TO_GRAMS.get(unit, 1.0)

    food_text = _QTY_UNIT_RE.sub("", desc_lower).strip()
    if not food_text:
        food_text = desc_lower

    from sklearn.metrics.pairwise import cosine_similarity
    query_vec  = tfidf_vectorizer.transform([food_text])
    sims       = cosine_similarity(query_vec, food_tfidf_matrix).flatten()
    best_idx   = int(np.argmax(sims))
    best_score = float(sims[best_idx])

    matched_row = food_db.iloc[best_idx]
    food_name   = str(matched_row.get("food_name", matched_row.name))

    nutrients = {}
    for nc, nc100 in zip(NUTRIENT_COLS, NORM_COLS):
        per100 = float(matched_row.get(nc100, 0) or 0)
        nutrients[nc] = round(per100 * qty_grams / 100.0, 3)

    return {
        "input": description,
        "matched_food": food_name,
        "quantity_grams": round(qty_grams, 1),
        "match_confidence": round(best_score, 3),
        "nutrients": nutrients,
    }


def _sum_nutrients(parsed_items: List[dict]) -> dict:
    totals = {nc: 0.0 for nc in NUTRIENT_COLS}
    for item in parsed_items:
        for nc in NUTRIENT_COLS:
            totals[nc] = round(totals[nc] + item["nutrients"].get(nc, 0.0), 3)
    return totals


def _get_daily_targets(phase: str, is_pregnant: bool) -> dict:
    baseline  = BASELINE_PREG if is_pregnant else BASELINE_NORMAL
    mult_key  = "Pregnancy" if is_pregnant else phase
    multipliers = PHASE_MULT.get(mult_key, {})
    targets = {}
    for req_key, base_val in baseline.items():
        nutrient = req_key.replace("Required_", "")
        m = multipliers.get(nutrient, 1.0)
        targets[req_key] = round(base_val * m, 2)
    return targets


def _analyse_deficiencies(totals: dict, targets: dict):
    deficiencies, surpluses = [], []
    for req_key, target in targets.items():
        nutrient = req_key.replace("Required_", "")
        actual   = totals.get(nutrient, 0.0)
        pct      = round((actual / target * 100) if target > 0 else 0, 1)
        diff     = round(actual - target, 2)
        entry    = {"nutrient": nutrient, "actual": actual, "target": target, "pct_met": pct, "gap": diff}
        if pct < DEF_THRESHOLD:
            deficiencies.append(entry)
        elif pct > 150:
            surpluses.append(entry)
    return deficiencies, surpluses


def _suggest_foods(deficiencies: List[dict]) -> List[dict]:
    seen_foods, suggestions = set(), []
    for deficit in deficiencies[:3]:
        nutrient = deficit["nutrient"]
        foods    = top_foods_index.get(nutrient) or top_foods_index.get(nutrient + "_per100g") or []
        for food in foods[:TOP_K]:
            fname = food.get("Food_Name", food.get("food_name", str(food)))
            if fname not in seen_foods:
                suggestions.append({
                    "food": fname,
                    "reason": f"High in {nutrient.replace('_', ' ')} (addresses {deficit['pct_met']:.0f}% coverage)",
                    "target_nutrient": nutrient,
                    "value_per100g": food.get("value_per100g", food.get("value")),
                    "category": food.get("Category", "General")
                })
                seen_foods.add(fname)
    return suggestions


def _symptom_insights(symptoms: List[str], deficiencies: List[dict]) -> List[dict]:
    insights = []
    deficit_nutrients = {d["nutrient"] for d in deficiencies}
    for symptom in symptoms:
        key     = symptom.lower().replace(" ", "_")
        linked  = SYMPTOM_MAP.get(key, [])
        relevant_deficits = [n for n in linked if n in deficit_nutrients]
        insights.append({
            "symptom": symptom,
            "linked_nutrients": linked,
            "deficient_linked": relevant_deficits,
            "tip": (
                f"Your {symptom.replace('_',' ')} may be worsened by low "
                + ", ".join(n.replace("_", " ") for n in relevant_deficits)
                if relevant_deficits else
                f"Maintain balanced {', '.join(n.replace('_',' ') for n in linked)} intake to help manage {symptom.replace('_',' ')}."
            ),
        })
    return insights


def _overall_score(deficiencies: List[dict], targets: dict) -> float:
    total_pct = sum(d["pct_met"] for d in deficiencies)
    num_def   = len(deficiencies)
    num_ok    = len(targets) - num_def
    full_score = (num_ok * 100 + total_pct) / max(len(targets), 1)
    return round(min(full_score, 100.0), 1)


# ─── Routes: Health ───────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "LunaFemCare API",
        "status": "online",
        "version": "2.0.0",
        "endpoints": [
            "/api/auth/signup", "/api/auth/login",
            "/api/log_day", "/api/history/{user_id}",
            "/api/process_food", "/api/get_recommendations",
            "/api/food_dictionary", "/api/health",
            "/api/admin/users",
        ],
    }


@app.get("/api/health", tags=["Health"])
async def health():
    return {"status": "healthy", "models_loaded": True, "supabase": bool(SUPABASE_URL)}


# ─── Routes: Auth ─────────────────────────────────────────────────────────────

@app.post("/api/auth/signup", tags=["Auth"])
async def signup(request: SignupRequest):
    """
    Creates a new user profile in Supabase.
    Passkey 'admin' is reserved and will be rejected.
    """
    key = request.passkey.strip()
    if key.lower() == "admin":
        raise HTTPException(status_code=400, detail="Passkey 'admin' is reserved.")
    if not key:
        raise HTTPException(status_code=400, detail="Passkey cannot be empty.")

    # Check uniqueness
    existing = supabase.table("profiles").select("id").eq("passkey", key).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Passkey already taken. Choose another.")

    health_flags = request.health_flags or {}
    if request.marital_status is not None:
        health_flags["marital_status"] = request.marital_status
    if request.pregnancy_planning is not None:
        health_flags["pregnancy_planning"] = request.pregnancy_planning
    if request.children_count is not None:
        health_flags["children_count"] = request.children_count
    if request.children_details is not None:
        health_flags["children_details"] = request.children_details

    payload = {
        "passkey":        key,
        "name":           request.name,
        "age":            request.age,
        "weight":         request.weight,
        "height":         request.height,
        "health_flags":   health_flags,
        "cycle_metadata": request.cycle_metadata or {},
        "is_pregnant":    request.is_pregnant,
        "role":           "user",
    }
    result = supabase.table("profiles").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create profile.")

    user = result.data[0]
    return {"status": "created", "user": user}


@app.post("/api/auth/login", tags=["Auth"])
async def login(request: LoginRequest):
    """
    Authenticates a user by passkey.
    Passkey 'admin' grants admin access without a database row.
    """
    key = request.passkey.strip()

    if key.lower() == "admin":
        return {
            "status": "ok",
            "role": "admin",
            "user": {
                "id":         "admin",
                "name":       "Administrator",
                "passkey":    "admin",
                "role":       "admin",
                "is_pregnant": False,
                "health_flags": {},
                "cycle_metadata": {},
            },
        }

    result = supabase.table("profiles").select("*").eq("passkey", key).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Passkey not found. Please sign up.")

    user = result.data[0]
    flags = user.get("health_flags") or {}
    user["marital_status"] = user.get("marital_status") if user.get("marital_status") is not None else flags.get("marital_status", "Single")
    user["pregnancy_planning"] = user.get("pregnancy_planning") if user.get("pregnancy_planning") is not None else flags.get("pregnancy_planning", None)
    user["children_count"] = user.get("children_count") if user.get("children_count") is not None else flags.get("children_count", 0)
    user["children_details"] = user.get("children_details") if user.get("children_details") is not None else flags.get("children_details", [])

    return {"status": "ok", "role": "user", "user": user}


@app.patch("/api/auth/profile/{user_id}", tags=["Auth"])
async def update_profile(user_id: str, request: ProfileUpdateRequest):
    """
    Updates an existing user profile with data collected during onboarding.
    Only fields that are provided (non-None) are updated.
    """
    payload: Dict[str, Any] = {}

    if request.name is not None:
        payload["name"] = request.name
    if request.age is not None:
        payload["age"] = request.age
    if request.weight is not None:
        payload["weight"] = request.weight
    if request.height is not None:
        payload["height"] = request.height
    if request.is_pregnant is not None:
        payload["is_pregnant"] = request.is_pregnant
    if request.health_flags is not None:
        payload["health_flags"] = request.health_flags
    if request.cycle_metadata is not None:
        payload["cycle_metadata"] = request.cycle_metadata

    # Store extra pregnancy fields in health_flags if provided
    # Also store marital status, etc. in health_flags
    prof = supabase.table("profiles").select("health_flags").eq("id", user_id).execute()
    existing_flags = (prof.data[0].get("health_flags") or {}) if prof.data else {}
    
    if "health_flags" in payload:
        merged = {**existing_flags, **payload["health_flags"]}
    else:
        merged = dict(existing_flags)

    needs_merge = False
    if request.pregnancy_week:
        merged["pregnancy_week"] = request.pregnancy_week
        needs_merge = True
    if request.expected_due_date:
        merged["expected_due_date"] = request.expected_due_date
        needs_merge = True
    if request.pregnancy_complications:
        merged["pregnancy_complications"] = request.pregnancy_complications
        needs_merge = True
    if request.marital_status is not None:
        merged["marital_status"] = request.marital_status
        needs_merge = True
    if request.pregnancy_planning is not None:
        merged["pregnancy_planning"] = request.pregnancy_planning
        needs_merge = True
    if request.children_count is not None:
        merged["children_count"] = request.children_count
        needs_merge = True
    if request.children_details is not None:
        merged["children_details"] = request.children_details
        needs_merge = True

    if "health_flags" in payload or needs_merge:
        payload["health_flags"] = merged

    if not payload:
        raise HTTPException(status_code=400, detail="No fields provided to update.")

    result = supabase.table("profiles").update(payload).eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found or update failed.")

    user = result.data[0]
    return {"status": "updated", "user": user}


# ─── Routes: Daily Logs ───────────────────────────────────────────────────────

@app.post("/api/log_day", tags=["Daily Logs"])
async def log_day(request: DailyLogRequest):
    """
    Upserts a daily log entry for a user.
    If a log for that (user_id, log_date) already exists, it is updated.
    """
    log_date_str = request.log_date or str(date.today())

    payload = {
        "user_id":     request.user_id,
        "log_date":    log_date_str,
        "symptoms":    request.symptoms or {},
        "food_intake": request.food_intake or [],
        "nutri_score": request.nutri_score or 0,
    }

    # Upsert based on uniqueness constraint (user_id, log_date)
    result = (
        supabase.table("daily_logs")
        .upsert(payload, on_conflict="user_id,log_date")
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save daily log.")

    return {"status": "saved", "log": result.data[0]}


@app.get("/api/history/{user_id}", tags=["Daily Logs"])
async def get_history(user_id: str, limit: int = 90):
    """
    Returns the last `limit` daily logs for a user, newest first.
    """
    result = (
        supabase.table("daily_logs")
        .select("*")
        .eq("user_id", user_id)
        .order("log_date", desc=True)
        .limit(limit)
        .execute()
    )
    return {"status": "ok", "history": result.data}


@app.post("/api/mark_menstruation", tags=["Daily Logs"])
async def mark_menstruation(request: MarkMenstruationRequest):
    """
    Toggles the is_menstruating flag in the symptoms JSON for a specific date,
    leaving food intake intact. Updates the profile last_period if applicable.
    """
    # 1. Fetch current log
    log_resp = supabase.table("daily_logs").select("*").eq("user_id", request.user_id).eq("log_date", request.log_date).execute()
    
    current_symptoms = {}
    current_food = []
    current_score = 0
    
    if log_resp.data:
        curr = log_resp.data[0]
        current_symptoms = curr.get("symptoms") or {}
        current_food = curr.get("food_intake") or []
        current_score = curr.get("nutri_score") or 0
        
    current_symptoms["is_menstruating"] = request.is_menstruating
    
    payload = {
        "user_id": request.user_id,
        "log_date": request.log_date,
        "symptoms": current_symptoms,
        "food_intake": current_food,
        "nutri_score": current_score,
    }
    
    upsert_resp = supabase.table("daily_logs").upsert(payload, on_conflict="user_id,log_date").execute()
    if not upsert_resp.data:
        raise HTTPException(status_code=500, detail="Failed to mark menstruation.")
        
    # 2. Update profile cycle metadata based on menstruation flag
    prof_resp = supabase.table("profiles").select("cycle_metadata").eq("id", request.user_id).execute()
    if prof_resp.data:
        metadata = prof_resp.data[0].get("cycle_metadata") or {}
        old_last = metadata.get("last_period") or "1970-01-01"
        
        if request.is_menstruating:
            if request.log_date >= old_last:
                metadata["last_period"] = request.log_date
                if "period_end_date" in metadata:
                    del metadata["period_end_date"]
                supabase.table("profiles").update({"cycle_metadata": metadata}).eq("id", request.user_id).execute()
        else:
            if request.log_date > old_last:
                # If they explicitly unmark it and it's after the start of their period, track as End Date
                metadata["period_end_date"] = request.log_date
                supabase.table("profiles").update({"cycle_metadata": metadata}).eq("id", request.user_id).execute()
                
    return {"status": "ok", "log": upsert_resp.data[0]}


@app.post("/api/recommendations/save", tags=["Recommendations"])
async def save_recommendation(request: SaveRecommendationRequest):
    """
    Persists an AI recommendation result to Supabase.
    """
    payload = {
        "user_id":        request.user_id,
        "date":           request.date or str(date.today()),
        "ai_suggestions": request.ai_suggestions,
        "risk_level":     request.risk_level,
    }
    result = supabase.table("recommendations").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save recommendation.")
    return {"status": "saved", "recommendation": result.data[0]}


# ─── Routes: Admin ────────────────────────────────────────────────────────────

@app.get("/api/admin/users", tags=["Admin"])
async def admin_get_users(x_admin_passkey: Optional[str] = Header(None)):
    """
    Returns all user profiles (admin only).
    Requires X-Admin-Passkey: admin header.
    """
    if x_admin_passkey != "admin":
        raise HTTPException(status_code=403, detail="Forbidden. Admin only.")

    result = supabase.table("profiles").select("*").order("created_at", desc=True).execute()
    return {"status": "ok", "users": result.data}


@app.delete("/api/admin/users/{user_id}", tags=["Admin"])
async def admin_delete_user(user_id: str, x_admin_passkey: Optional[str] = Header(None)):
    """
    Deletes a user by ID (admin only).
    Also cascades to daily_logs and recommendations.
    Requires X-Admin-Passkey: admin header.
    """
    if x_admin_passkey != "admin":
        raise HTTPException(status_code=403, detail="Forbidden. Admin only.")

    # Delete cascades via FK constraint (ON DELETE CASCADE)
    result = supabase.table("profiles").delete().eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"status": "deleted", "user_id": user_id}


# ─── Routes: Food Dictionary ──────────────────────────────────────────────────

@app.get("/api/food_dictionary", tags=["Data Mapping"])
async def get_food_dictionary():
    """
    Returns the complete list of mapped nutrition items for react-select dropdowns.
    """
    return {"status": "success", "data": food_mapping_dict}


@app.get("/api/food_database", tags=["Data Mapping"])
async def get_food_database():
    """
    Returns the complete food database rows for the table UI.
    """
    records = food_db.replace({np.nan: None}).to_dict(orient="records")
    return {"status": "success", "data": records}


# ─── Routes: ML Models ────────────────────────────────────────────────────────

@app.post("/api/process_food", response_model=ProcessFoodResponse, tags=["Model 1 – Nutrient Processor"])
async def process_food(request: ProcessFoodRequest):
    """
    **Model 1 – Nutrient Processor**
    Accepts food descriptions and returns a combined nutrient vector.
    """
    if not request.food_items:
        raise HTTPException(status_code=400, detail="food_items list cannot be empty.")
    try:
        parsed = [_parse_single_item(item.description) for item in request.food_items]
        totals = _sum_nutrients(parsed)
        return ProcessFoodResponse(
            status="success",
            parsed_items=parsed,
            total_nutrients=NutrientVector(**totals),
            message=f"Successfully processed {len(parsed)} food item(s).",
        )
    except Exception as exc:
        logger.exception("Error in /api/process_food: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/get_recommendations", response_model=RecommendationResponse, tags=["Model 2 – Recommendation Engine"])
async def get_recommendations(request: RecommendationRequest):
    """
    **Model 2 – Recommendation & Risk Engine**
    Accepts a NutrientVector + context and returns phase-adjusted targets,
    deficiencies, food suggestions, symptom insights, and an overall score.
    """
    phase = request.phase.strip().capitalize()
    if request.is_pregnant:
        phase = "Pregnancy"

    if phase not in VALID_PHASES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid phase '{phase}'. Valid options: {sorted(VALID_PHASES)}",
        )

    try:
        totals           = request.nutrient_vector.model_dump()
        targets          = _get_daily_targets(phase, request.is_pregnant)
        deficiencies, surpluses = _analyse_deficiencies(totals, targets)
        food_suggestions = _suggest_foods(deficiencies)
        symptom_insights = _symptom_insights(request.symptoms or [], deficiencies)
        score            = _overall_score(deficiencies, targets)

        return RecommendationResponse(
            status="success",
            phase=phase,
            is_pregnant=request.is_pregnant,
            daily_targets=targets,
            deficiencies=deficiencies,
            surpluses=surpluses,
            food_suggestions=food_suggestions,
            symptom_insights=symptom_insights,
            overall_score=score,
            message=f"Recommendations generated for {phase} phase. Overall score: {score}/100.",
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error in /api/get_recommendations: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))
