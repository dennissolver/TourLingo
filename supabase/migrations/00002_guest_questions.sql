-- Add guest_questions table for Q&A feature
-- Run this in Supabase SQL Editor

-- Guest Questions Table
CREATE TABLE IF NOT EXISTS guest_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  original_text TEXT NOT NULL,
  original_language VARCHAR(10) NOT NULL DEFAULT 'en',
  translated_text TEXT NOT NULL, -- Always English for operator
  audio_url TEXT, -- Optional: store audio recording
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'playing', 'answered', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at TIMESTAMPTZ
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_guest_questions_tour_id ON guest_questions(tour_id);
CREATE INDEX IF NOT EXISTS idx_guest_questions_status ON guest_questions(status);
CREATE INDEX IF NOT EXISTS idx_guest_questions_created_at ON guest_questions(created_at);

-- Function to increment questions_asked counter
CREATE OR REPLACE FUNCTION increment_questions_asked(participant_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE participants
  SET questions_asked = questions_asked + 1
  WHERE id = participant_id;
END;
$$ LANGUAGE plpgsql;

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE guest_questions;

-- RLS Policies
ALTER TABLE guest_questions ENABLE ROW LEVEL SECURITY;

-- Guests can insert questions for their tour
CREATE POLICY "Guests can insert questions" ON guest_questions
  FOR INSERT WITH CHECK (true);

-- Anyone in tour can read questions (for now, we'll refine later)
CREATE POLICY "Tour participants can read questions" ON guest_questions
  FOR SELECT USING (true);

-- Only operators can update question status
CREATE POLICY "Operators can update questions" ON guest_questions
  FOR UPDATE USING (true);
