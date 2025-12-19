-- ============================================================
-- Wave 7: Performance Optimization - Database Indexes
-- Migration: 001_add_performance_indexes
-- Date: 2025-11-11
-- Purpose: Add indexes to frequently queried columns for better performance
-- ============================================================

-- Expected Impact: 50-70% faster queries on indexed columns

-- ============================================================
-- 1. whatsapp_messages Table Indexes
-- ============================================================

-- Composite index for phone_number + created_at (most common query pattern)
-- Used by: conversation history queries, message lookups
-- Query: SELECT * FROM whatsapp_messages WHERE phone_number = ? ORDER BY created_at DESC LIMIT 20
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone_created
ON whatsapp_messages(phone_number, created_at DESC);

-- Index for from_me filtering (used in history queries)
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_from_me
ON whatsapp_messages(from_me);

-- ============================================================
-- 2. enhanced_conversation_states Table Indexes
-- ============================================================

-- Primary index on phone_number (unique lookups)
-- Used by: Lead state lookups, BANT stage queries
-- Query: SELECT * FROM enhanced_conversation_states WHERE phone_number = ?
CREATE INDEX IF NOT EXISTS idx_enhanced_conversation_states_phone
ON enhanced_conversation_states(phone_number);

-- Index on current_agent (for agent-specific queries)
CREATE INDEX IF NOT EXISTS idx_enhanced_conversation_states_agent
ON enhanced_conversation_states(current_agent);

-- Index on bant_stage (for funnel analysis)
CREATE INDEX IF NOT EXISTS idx_enhanced_conversation_states_bant_stage
ON enhanced_conversation_states(bant_stage);

-- Index on updated_at (for recent activity queries)
CREATE INDEX IF NOT EXISTS idx_enhanced_conversation_states_updated
ON enhanced_conversation_states(updated_at DESC);

-- ============================================================
-- 3. memory Table Indexes
-- ============================================================

-- Index on key (unique key-value lookups)
-- Used by: Opt-out checks, cache lookups
-- Query: SELECT value FROM memory WHERE key = ?
CREATE INDEX IF NOT EXISTS idx_memory_key
ON memory(key);

-- ============================================================
-- 4. bot_blocks Table Indexes
-- ============================================================

-- Index on phone_number (bot detection lookups)
-- Used by: Bot detection system
-- Query: SELECT * FROM bot_blocks WHERE phone_number = ?
CREATE INDEX IF NOT EXISTS idx_bot_blocks_phone
ON bot_blocks(phone_number);

-- Index on blocked_at (for cleanup queries)
CREATE INDEX IF NOT EXISTS idx_bot_blocks_blocked_at
ON bot_blocks(blocked_at DESC);

-- ============================================================
-- 5. agent_metrics Table Indexes
-- ============================================================

-- Composite index for agent metrics queries
-- Used by: Analytics, performance tracking
CREATE INDEX IF NOT EXISTS idx_agent_metrics_agent_created
ON agent_metrics(agent_name, created_at DESC);

-- Index on phone_number for lead-specific metrics
CREATE INDEX IF NOT EXISTS idx_agent_metrics_phone
ON agent_metrics(phone_number);

-- ============================================================
-- 6. enhanced_metrics Table Indexes
-- ============================================================

-- Composite index for metrics queries
CREATE INDEX IF NOT EXISTS idx_enhanced_metrics_phone_logged
ON enhanced_metrics(phone_number, logged_at DESC);

-- Index on state transitions (for funnel analysis)
CREATE INDEX IF NOT EXISTS idx_enhanced_metrics_states
ON enhanced_metrics(state_from, state_to);

-- ============================================================
-- Verification Queries
-- ============================================================

-- Run these queries to verify indexes were created:
-- SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' ORDER BY tbl_name, name;

-- Test query performance before/after:
-- EXPLAIN QUERY PLAN SELECT * FROM whatsapp_messages WHERE phone_number = '+5511999999999' ORDER BY created_at DESC LIMIT 20;
