-- TourLingo Database Schema
-- Initial migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- OPERATORS TABLE
-- ============================================
CREATE TABLE operators (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    primary_language VARCHAR(10) DEFAULT 'en',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TOURS TABLE
-- ============================================
CREATE TABLE tours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    access_code VARCHAR(6) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'created' CHECK (status IN ('created', 'waiting', 'live', 'ended', 'archived')),
    max_guests INTEGER DEFAULT 16,
    livekit_room_name VARCHAR(255),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tours_operator_id ON tours(operator_id);
CREATE INDEX idx_tours_access_code ON tours(access_code);
CREATE INDEX idx_tours_status ON tours(status);

-- ============================================
-- PARTICIPANTS TABLE
-- ============================================
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    display_name VARCHAR(100) NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    is_operator BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    questions_asked INTEGER DEFAULT 0
);

CREATE INDEX idx_participants_tour_id ON participants(tour_id);
CREATE INDEX idx_participants_user_id ON participants(user_id);

-- ============================================
-- ARCHIVES TABLE
-- ============================================
CREATE TABLE archives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
    duration_seconds INTEGER,
    guest_count INTEGER,
    languages TEXT[],
    question_count INTEGER DEFAULT 0,
    operator_audio_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_archives_tour_id ON archives(tour_id);

-- ============================================
-- TRANSCRIPT SEGMENTS TABLE
-- ============================================
CREATE TABLE transcript_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    archive_id UUID NOT NULL REFERENCES archives(id) ON DELETE CASCADE,
    speaker_id UUID,
    speaker_name VARCHAR(100) NOT NULL,
    speaker_role VARCHAR(20) CHECK (speaker_role IN ('operator', 'guest')),
    original_text TEXT NOT NULL,
    original_language VARCHAR(10) NOT NULL,
    translations JSONB DEFAULT '{}',
    timestamp_ms INTEGER NOT NULL,
    duration_ms INTEGER,
    is_question BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transcript_segments_archive_id ON transcript_segments(archive_id);
CREATE INDEX idx_transcript_segments_timestamp ON transcript_segments(timestamp_ms);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_segments ENABLE ROW LEVEL SECURITY;

-- Operators policies
CREATE POLICY "Operators can view own profile"
    ON operators FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Operators can update own profile"
    ON operators FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Operators can insert own profile"
    ON operators FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Tours policies
CREATE POLICY "Operators can view own tours"
    ON tours FOR SELECT
    USING (operator_id = auth.uid());

CREATE POLICY "Anyone can view tour by access code"
    ON tours FOR SELECT
    USING (true);

CREATE POLICY "Operators can create tours"
    ON tours FOR INSERT
    WITH CHECK (operator_id = auth.uid());

CREATE POLICY "Operators can update own tours"
    ON tours FOR UPDATE
    USING (operator_id = auth.uid());

CREATE POLICY "Operators can delete own tours"
    ON tours FOR DELETE
    USING (operator_id = auth.uid());

-- Participants policies
CREATE POLICY "Anyone can view tour participants"
    ON participants FOR SELECT
    USING (true);

CREATE POLICY "Anyone can join a tour"
    ON participants FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Participants can update own record"
    ON participants FOR UPDATE
    USING (user_id = auth.uid() OR user_id IS NULL);

-- Archives policies
CREATE POLICY "Operators can view own archives"
    ON archives FOR SELECT
    USING (
        tour_id IN (
            SELECT id FROM tours WHERE operator_id = auth.uid()
        )
    );

CREATE POLICY "System can create archives"
    ON archives FOR INSERT
    WITH CHECK (true);

-- Transcript segments policies
CREATE POLICY "Operators can view own transcripts"
    ON transcript_segments FOR SELECT
    USING (
        archive_id IN (
            SELECT a.id FROM archives a
            JOIN tours t ON a.tour_id = t.id
            WHERE t.operator_id = auth.uid()
        )
    );

CREATE POLICY "System can create transcript segments"
    ON transcript_segments FOR INSERT
    WITH CHECK (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at
CREATE TRIGGER update_operators_updated_at
    BEFORE UPDATE ON operators
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tours_updated_at
    BEFORE UPDATE ON tours
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create operator profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO operators (id, name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Increment questions asked
CREATE OR REPLACE FUNCTION increment_questions_asked(participant_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE participants
    SET questions_asked = questions_asked + 1
    WHERE id = participant_id;
END;
$$ language 'plpgsql';

-- Generate unique access code
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS VARCHAR(6) AS $$
DECLARE
    chars VARCHAR(32) := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    code VARCHAR(6) := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN code;
END;
$$ language 'plpgsql';
