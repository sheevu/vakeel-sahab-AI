-- Schema for Vakeel GPT Legal Knowledge Base
-- Target: Cloudflare D1 (SQLite)

-- 1. Table for Statutory Acts (BNS, IPC, etc.)
CREATE TABLE IF NOT EXISTS acts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    act_name TEXT NOT NULL,
    section_number TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    keywords TEXT, -- JSON array of keywords
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table for Supreme Court Judgments (1950-2024)
CREATE TABLE IF NOT EXISTS judgments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_name TEXT NOT NULL,
    citation TEXT,
    judgment_date DATE,
    bench_strength INTEGER, -- Important for Legal Logic priority
    authoring_judge TEXT,
    petitioner TEXT,
    respondent TEXT,
    ratio_decidendi TEXT, -- Core legal principle
    full_text_link TEXT, -- Link to original PDF or large storage
    summary TEXT
);

-- 3. Table for Landmark Judgments (The 373 curated cases)
CREATE TABLE IF NOT EXISTS landmark_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    judgment_id INTEGER REFERENCES judgments(id),
    significance TEXT, -- Why it's a landmark
    legal_concepts TEXT -- JSON array (e.g., ["Basic Structure", "Privacy"])
);

-- 4. Table for Semantic Cache (To prevent token burn on repeated questions)
CREATE TABLE IF NOT EXISTS semantic_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_hash TEXT UNIQUE NOT NULL, -- To quickly find exact matches
    user_query TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Full-Text Search Index (Virtual Table)
-- This allows incredibly fast "Search Act" or "Search Case" lookups without LLM
CREATE VIRTUAL TABLE IF NOT EXISTS legal_search_index USING fts5(
    act_name,
    section_number,
    content,
    case_name,
    ratio_decidendi,
    tokenize='porter' -- Handles variations like "murder" vs "murdered"
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_acts_section ON acts(act_name, section_number);
CREATE INDEX IF NOT EXISTS idx_judgments_date ON judgments(judgment_date);
