const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export interface FoodItem {
  description: string;
}

export interface ProcessFoodRequest {
  food_items: FoodItem[];
}

export interface NutrientVector {
  Energy_kcal: number;
  Protein_g: number;
  Fat_g: number;
  Carbs_g: number;
  Fiber_g: number;
  Iron_mg: number;
  Calcium_mg: number;
  Vit_A_mcg: number;
  Sodium_mg: number;
}

export interface ProcessFoodResponse {
  status: string;
  parsed_items: ParsedFoodItem[];
  total_nutrients: NutrientVector;
  message: string;
}

export interface ParsedFoodItem {
  input: string;
  matched_food: string;
  quantity_grams: number;
  match_confidence: number;
  nutrients: NutrientVector;
}

export interface RecommendationRequest {
  nutrient_vector: NutrientVector;
  phase: string;
  is_pregnant: boolean;
  symptoms: string[];
}

export interface RecommendationResponse {
  status: string;
  phase: string;
  is_pregnant: boolean;
  daily_targets: Record<string, number>;
  deficiencies: DeficiencyEntry[];
  surpluses: DeficiencyEntry[];
  food_suggestions: FoodSuggestion[];
  symptom_insights: SymptomInsight[];
  overall_score: number;
  message: string;
}

export interface DeficiencyEntry {
  nutrient: string;
  actual: number;
  target: number;
  pct_met: number;
  gap: number;
}

export interface FoodSuggestion {
  food: string;
  reason: string;
  target_nutrient: string;
  value_per100g: number | null;
}

export interface SymptomInsight {
  symptom: string;
  linked_nutrients: string[];
  deficient_linked: string[];
  tip: string;
}

export interface UserProfile {
  id: string;
  name: string;
  passkey: string;
  age?: number;
  weight?: number;
  height?: number;
  health_flags?: Record<string, boolean>;
  cycle_metadata?: Record<string, string | number>;
  is_pregnant: boolean;
  marital_status?: string;
  pregnancy_planning?: string;
  children_count?: number;
  children_details?: any[];
  role: string;
}

export interface SignupPayload {
  passkey: string;
  name: string;
  age?: number;
  weight?: number;
  height?: number;
  health_flags?: Record<string, boolean>;
  cycle_metadata?: Record<string, string | number>;
  is_pregnant?: boolean;
  marital_status?: string;
  pregnancy_planning?: string;
  children_count?: number;
  children_details?: any[];
}

export interface DailyLogPayload {
  user_id: string;
  log_date?: string;
  symptoms?: Record<string, string>;
  food_intake?: any[];
  nutri_score?: number;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authSignup = async (payload: SignupPayload): Promise<{ status: string; user: UserProfile }> => {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Signup failed");
  return data;
};

export const authLogin = async (passkey: string): Promise<{ status: string; role: string; user: UserProfile }> => {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passkey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Login failed");
  return data;
};

// ─── Daily Logs ───────────────────────────────────────────────────────────────

export const saveLog = async (payload: DailyLogPayload) => {
  const res = await fetch(`${API_BASE}/api/log_day`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to save log");
  return data;
};

export const getHistory = async (userId: string, limit = 90) => {
  const res = await fetch(`${API_BASE}/api/history/${userId}?limit=${limit}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to fetch history");
  return data.history;
};

export const markMenstruation = async (userId: string, date: string, isMenstruating: boolean) => {
  const res = await fetch(`${API_BASE}/api/mark_menstruation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      log_date: date,
      is_menstruating: isMenstruating
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to mark menstruation");
  return data;
};

// ─── ML Models ────────────────────────────────────────────────────────────────

export const processFood = async (request: ProcessFoodRequest): Promise<ProcessFoodResponse> => {
  const res = await fetch(`${API_BASE}/api/process_food`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to process food");
  return data;
};

export const getRecommendations = async (request: RecommendationRequest): Promise<RecommendationResponse> => {
  const res = await fetch(`${API_BASE}/api/get_recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to get recommendations");
  return data;
};

export const getFoodDictionary = async (): Promise<{ status: string; data: any[] }> => {
  const res = await fetch(`${API_BASE}/api/food_dictionary`);
  const data = await res.json();
  if (!res.ok) throw new Error("Failed to fetch food dictionary");
  return data;
};

export const getFoodDatabase = async (): Promise<{ status: string; data: any[] }> => {
  const res = await fetch(`${API_BASE}/api/food_database`);
  const data = await res.json();
  if (!res.ok) throw new Error("Failed to fetch food database");
  return data;
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminGetUsers = async (): Promise<{ status: string; users: UserProfile[] }> => {
  const res = await fetch(`${API_BASE}/api/admin/users`, {
    headers: { "X-Admin-Passkey": "admin" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Forbidden");
  return data;
};

// ─── Profile Update ───────────────────────────────────────────────────────────

export interface ProfileUpdatePayload {
  name?: string;
  age?: number;
  weight?: number;
  height?: number;
  health_flags?: Record<string, any>;
  cycle_metadata?: Record<string, any>;
  is_pregnant?: boolean;
  marital_status?: string;
  pregnancy_planning?: string;
  children_count?: number;
  children_details?: any[];
  pregnancy_week?: string;
  expected_due_date?: string;
  pregnancy_complications?: string;
}

export const updateProfile = async (userId: string, payload: ProfileUpdatePayload): Promise<{ status: string; user: UserProfile }> => {
  const res = await fetch(`${API_BASE}/api/auth/profile/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to update profile");
  return data;
};
