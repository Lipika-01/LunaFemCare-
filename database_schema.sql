-- LunaFemCare Full Database Schema & Setup Script (PostgreSQL / Supabase)
-- Execute this script in the Supabase SQL Editor.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
-- Stores all users including admins and regular users.
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    age INT,
    weight FLOAT,
    height FLOAT,
    health_flags JSONB DEFAULT '{}', -- Example: {"pcos": true, "thyroid": false}
    cycle_metadata JSONB DEFAULT '{}', -- Example: {"avg_length": 28, "last_period": "2023-10-01"}
    is_pregnant BOOLEAN DEFAULT FALSE,
    passkey VARCHAR(255) UNIQUE NOT NULL, -- Used for login/authentication
    role VARCHAR(50) DEFAULT 'user', -- 'user' or 'admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Note: We use unique passkeys to maintain simple authentication as per requirements.

-- 2. Daily Logs Table
-- Tracks daily symptom progression and daily nutrition.
CREATE TABLE daily_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- MCQ JSONB Stores questions and selected answers, e.g. {"vaginal_secretion": "Fishy Smell", "mood": "Anxious"}
    symptoms JSONB DEFAULT '{}', 
    
    -- Array of nutrition JSON records: [{"mapped_id": "uuid", "quantity": 1.5, "unit": "cup"}]
    food_intake JSONB DEFAULT '[]', 
    
    nutri_score INT DEFAULT 0, -- Ranging 0-100 indicating health/food effectiveness for the day's phase
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure only one log entry per user per day.
    UNIQUE(user_id, log_date)
);

-- 3. Recommendations Table
-- Stores historical AI generated responses to serve as tracking history and PDF exports.
CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    ai_suggestions TEXT NOT NULL,
    risk_level VARCHAR(50) DEFAULT 'low', -- 'low', 'medium', 'high', 'severe'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Mapping / Data Dictionary Table
-- Bridging frontend names exactly with Model trained keys.
CREATE TABLE food_mapping_dictionary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    frontend_label VARCHAR(255) NOT NULL, -- "Veg Biryani"
    model_key VARCHAR(255) NOT NULL,      -- "EggBiryani" (as requested by ML models)
    calories FLOAT,
    protein FLOAT,
    carbs FLOAT,
    fats FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Row Level Security (RLS) Settings
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_mapping_dictionary ENABLE ROW LEVEL SECURITY;

-- Creating basic policies (Optional, adjust based on server-side vs client-side strategy)
-- Assuming we use service_role on backend, we can bypass RLS, or we can write strict policies.
CREATE POLICY "Allow service role access" ON profiles FOR ALL USING (true);
CREATE POLICY "Allow service role access" ON daily_logs FOR ALL USING (true);
CREATE POLICY "Allow service role access" ON recommendations FOR ALL USING (true);
CREATE POLICY "Allow read access to dict" ON food_mapping_dictionary FOR SELECT USING (true);
