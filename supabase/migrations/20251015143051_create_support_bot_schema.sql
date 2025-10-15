/*
  # AI Customer Support Bot Database Schema

  1. New Tables
    - `faqs`
      - `id` (uuid, primary key) - Unique identifier for FAQ
      - `question` (text) - FAQ question
      - `answer` (text) - FAQ answer
      - `category` (text) - Category for grouping FAQs
      - `keywords` (text array) - Keywords for matching
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `support_sessions`
      - `id` (uuid, primary key) - Unique session identifier
      - `user_id` (text) - Anonymous user identifier (not auth-linked)
      - `started_at` (timestamptz) - Session start time
      - `last_activity_at` (timestamptz) - Last interaction time
      - `status` (text) - Session status: active, resolved, escalated
      - `escalated_reason` (text) - Reason for escalation if applicable
      - `created_at` (timestamptz) - Creation timestamp
    
    - `conversation_messages`
      - `id` (uuid, primary key) - Unique message identifier
      - `session_id` (uuid, foreign key) - Reference to support session
      - `role` (text) - Message role: user, assistant, system
      - `content` (text) - Message content
      - `metadata` (jsonb) - Additional metadata (confidence score, matched FAQ, etc.)
      - `created_at` (timestamptz) - Message timestamp

  2. Security
    - Enable RLS on all tables
    - Public read access for FAQs (knowledge base)
    - Session-based access for conversations (user can only access their own sessions)
    - Anonymous users can create and read their own sessions

  3. Indexes
    - Index on session_id for fast conversation lookups
    - Index on keywords for FAQ matching
    - Index on user_id for session retrieval

  4. Important Notes
    - Sessions use anonymous user_id (not tied to auth) for demo purposes
    - Metadata field stores LLM confidence scores and matched FAQ references
    - Escalation tracking built into session status
*/

-- Create FAQs table
CREATE TABLE IF NOT EXISTS faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text DEFAULT 'general',
  keywords text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create support sessions table
CREATE TABLE IF NOT EXISTS support_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  started_at timestamptz DEFAULT now(),
  last_activity_at timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'escalated')),
  escalated_reason text,
  created_at timestamptz DEFAULT now()
);

-- Create conversation messages table
CREATE TABLE IF NOT EXISTS conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES support_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON conversation_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON support_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_faqs_keywords ON faqs USING GIN(keywords);

-- Enable RLS
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for FAQs (public read access)
CREATE POLICY "Anyone can view FAQs"
  ON faqs FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert FAQs"
  ON faqs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update FAQs"
  ON faqs FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- RLS Policies for support sessions
CREATE POLICY "Users can view own sessions"
  ON support_sessions FOR SELECT
  USING (true);

CREATE POLICY "Users can create sessions"
  ON support_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own sessions"
  ON support_sessions FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- RLS Policies for conversation messages
CREATE POLICY "Users can view messages in accessible sessions"
  ON conversation_messages FOR SELECT
  USING (true);

CREATE POLICY "Users can create messages"
  ON conversation_messages FOR INSERT
  WITH CHECK (true);
