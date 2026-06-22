"""
LunaFemCare – Backend API Tests (pytest + FastAPI TestClient)
Run from project root:  pytest backend/test_api.py -v
"""

import pytest
from fastapi.testclient import TestClient

# Import the app (models are loaded at module import time)
from backend.main import app

client = TestClient(app)

# ─── /api/health ─────────────────────────────────────────────────────────────

def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"
    assert r.json()["models_loaded"] is True

def test_food_dictionary():
    r = client.get("/api/food_dictionary")
    assert r.status_code == 200
    assert r.json()["status"] == "success"
    assert "data" in r.json()
    assert len(r.json()["data"]) > 0


# ─── /api/process_food ───────────────────────────────────────────────────────

FOOD_PAYLOAD = {
    "food_items": [
        {"description": "100g poha"},
        {"description": "1 cup dal"},
        {"description": "2 rotis"},
    ]
}

def test_process_food_success():
    r = client.post("/api/process_food", json=FOOD_PAYLOAD)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "success"
    assert len(data["parsed_items"]) == 3
    nv = data["total_nutrients"]
    # All nutrient keys present
    for key in ["Energy_kcal", "Protein_g", "Fat_g", "Carbs_g",
                "Fiber_g", "Iron_mg", "Calcium_mg", "Vit_A_mcg", "Sodium_mg"]:
        assert key in nv, f"Missing nutrient key: {key}"
    # Values should be non-negative
    assert nv["Energy_kcal"] >= 0


def test_process_food_empty_list():
    r = client.post("/api/process_food", json={"food_items": []})
    assert r.status_code == 400


def test_process_food_single_item():
    r = client.post("/api/process_food", json={"food_items": [{"description": "1 bowl oats"}]})
    assert r.status_code == 200
    assert r.json()["status"] == "success"


# ─── /api/get_recommendations ─────────────────────────────────────────────────

BASE_NUTRIENT = {
    "Energy_kcal": 800.0,
    "Protein_g": 25.0,
    "Fat_g": 20.0,
    "Carbs_g": 120.0,
    "Fiber_g": 10.0,
    "Iron_mg": 6.0,
    "Calcium_mg": 400.0,
    "Vit_A_mcg": 250.0,
    "Sodium_mg": 900.0,
}

@pytest.mark.parametrize("phase", ["Menstrual", "Follicular", "Ovulatory", "Luteal"])
def test_recommendations_all_phases(phase):
    payload = {
        "nutrient_vector": BASE_NUTRIENT,
        "phase": phase,
        "is_pregnant": False,
        "symptoms": ["fatigue", "cramps"],
    }
    r = client.post("/api/get_recommendations", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "success"
    assert data["phase"] == phase
    assert isinstance(data["deficiencies"], list)
    assert isinstance(data["food_suggestions"], list)
    assert 0.0 <= data["overall_score"] <= 100.0


def test_recommendations_pregnancy_override():
    """When is_pregnant=True, phase should be forced to 'Pregnancy'."""
    payload = {
        "nutrient_vector": BASE_NUTRIENT,
        "phase": "Menstrual",        # should be overridden
        "is_pregnant": True,
        "symptoms": ["nausea"],
    }
    r = client.post("/api/get_recommendations", json=payload)
    assert r.status_code == 200
    assert r.json()["phase"] == "Pregnancy"
    assert r.json()["is_pregnant"] is True


def test_recommendations_invalid_phase():
    payload = {
        "nutrient_vector": BASE_NUTRIENT,
        "phase": "Intergalactic",
        "is_pregnant": False,
        "symptoms": [],
    }
    r = client.post("/api/get_recommendations", json=payload)
    assert r.status_code == 422


def test_recommendations_symptom_insights():
    payload = {
        "nutrient_vector": BASE_NUTRIENT,
        "phase": "Luteal",
        "is_pregnant": False,
        "symptoms": ["fatigue", "mood_swings", "bloating"],
    }
    r = client.post("/api/get_recommendations", json=payload)
    assert r.status_code == 200
    insights = r.json()["symptom_insights"]
    assert len(insights) == 3
    symptom_names = [i["symptom"] for i in insights]
    assert "fatigue" in symptom_names


def test_recommendations_no_symptoms():
    payload = {
        "nutrient_vector": BASE_NUTRIENT,
        "phase": "Follicular",
        "is_pregnant": False,
        "symptoms": [],
    }
    r = client.post("/api/get_recommendations", json=payload)
    assert r.status_code == 200
    assert r.json()["symptom_insights"] == []
