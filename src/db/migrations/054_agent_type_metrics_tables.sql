-- ============================================================================
-- Migration 054: Agent Type-Specific Metrics Tables
-- ============================================================================
-- Creates tables for tracking metrics specific to each agent type:
-- - support_tickets: For Support agents (ticket tracking, SLA)
-- - scheduler_bookings: For Scheduler agents (appointment tracking)
-- - document_processing_stats: For Document Handler agents (processing metrics)
-- ============================================================================

-- ============================================================================
-- SUPPORT AGENT: Ticket Tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  agent_id TEXT,
  conversation_id TEXT,
  phone_number TEXT,
  customer_name TEXT,

  -- Ticket Status
  status TEXT DEFAULT 'open' CHECK(status IN ('open', 'pending', 'in_progress', 'resolved', 'closed', 'escalated')),
  priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
  category TEXT,
  subcategory TEXT,

  -- SLA Tracking
  sla_deadline TIMESTAMP,
  sla_breached INTEGER DEFAULT 0,
  first_response_at TIMESTAMP,
  first_response_time_ms INTEGER,

  -- Resolution
  resolved_at TIMESTAMP,
  resolution_time_ms INTEGER,
  resolution_notes TEXT,
  resolved_by TEXT,

  -- Satisfaction
  csat_score INTEGER CHECK(csat_score BETWEEN 1 AND 5),
  csat_comment TEXT,

  -- Metadata
  tags TEXT, -- JSON array
  custom_fields TEXT, -- JSON object

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_agent ON support_tickets(agent_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_phone ON support_tickets(phone_number);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at);

-- ============================================================================
-- SCHEDULER AGENT: Booking/Appointment Tracking
-- ============================================================================
-- Note: meetings table already exists, this adds scheduling-specific metrics
CREATE TABLE IF NOT EXISTS scheduler_bookings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  agent_id TEXT,
  meeting_id TEXT, -- References meetings table
  phone_number TEXT,
  customer_name TEXT,

  -- Booking Details
  booking_type TEXT DEFAULT 'appointment', -- appointment, demo, consultation, follow_up
  channel TEXT DEFAULT 'whatsapp', -- whatsapp, web, phone

  -- Status Tracking
  status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'confirmed', 'completed', 'no_show', 'cancelled', 'rescheduled')),
  confirmation_sent INTEGER DEFAULT 0,
  reminder_sent INTEGER DEFAULT 0,

  -- Time Tracking
  scheduled_at TIMESTAMP,
  confirmed_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,

  -- Rescheduling
  original_time TIMESTAMP,
  reschedule_count INTEGER DEFAULT 0,

  -- Follow-up
  follow_up_required INTEGER DEFAULT 0,
  follow_up_notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scheduler_bookings_tenant ON scheduler_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scheduler_bookings_agent ON scheduler_bookings(agent_id);
CREATE INDEX IF NOT EXISTS idx_scheduler_bookings_status ON scheduler_bookings(status);
CREATE INDEX IF NOT EXISTS idx_scheduler_bookings_scheduled ON scheduler_bookings(scheduled_at);

-- ============================================================================
-- DOCUMENT HANDLER: Processing Stats (Daily Aggregates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_processing_stats (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  agent_id TEXT,
  date DATE NOT NULL,

  -- Volume Metrics
  received_count INTEGER DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  pending_count INTEGER DEFAULT 0,

  -- By Document Type (JSON)
  by_type TEXT, -- {"licitacao": 5, "contrato": 3, ...}

  -- By Origin (JSON)
  by_origin TEXT, -- {"upload": 2, "webhook": 8, "email": 1}

  -- Performance Metrics
  avg_processing_time_ms INTEGER,
  max_processing_time_ms INTEGER,
  min_processing_time_ms INTEGER,

  -- OCR Metrics
  ocr_used_count INTEGER DEFAULT 0,
  ocr_success_rate REAL,

  -- Distribution Metrics
  notifications_sent INTEGER DEFAULT 0,
  notifications_failed INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(tenant_id, agent_id, date)
);

CREATE INDEX IF NOT EXISTS idx_doc_stats_tenant ON document_processing_stats(tenant_id);
CREATE INDEX IF NOT EXISTS idx_doc_stats_agent ON document_processing_stats(agent_id);
CREATE INDEX IF NOT EXISTS idx_doc_stats_date ON document_processing_stats(date);

-- ============================================================================
-- SDR/SPECIALIST: Prospecting Stats (Daily Aggregates)
-- ============================================================================
-- Note: Most SDR metrics come from existing tables (leads, cadence_enrollments)
-- This adds daily aggregates for dashboard performance
CREATE TABLE IF NOT EXISTS sdr_daily_stats (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  agent_id TEXT,
  date DATE NOT NULL,

  -- Lead Volume
  new_leads INTEGER DEFAULT 0,
  contacted_leads INTEGER DEFAULT 0,
  qualified_leads INTEGER DEFAULT 0,
  disqualified_leads INTEGER DEFAULT 0,

  -- Conversion Funnel
  leads_to_meeting INTEGER DEFAULT 0,
  meetings_completed INTEGER DEFAULT 0,
  meetings_no_show INTEGER DEFAULT 0,

  -- Messaging
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  response_rate REAL,
  avg_response_time_ms INTEGER,

  -- BANT
  avg_bant_score REAL,
  bant_completed INTEGER DEFAULT 0,

  -- Pipeline Value
  pipeline_value_added REAL DEFAULT 0,
  deals_won INTEGER DEFAULT 0,
  deals_won_value REAL DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(tenant_id, agent_id, date)
);

CREATE INDEX IF NOT EXISTS idx_sdr_stats_tenant ON sdr_daily_stats(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sdr_stats_agent ON sdr_daily_stats(agent_id);
CREATE INDEX IF NOT EXISTS idx_sdr_stats_date ON sdr_daily_stats(date);

-- ============================================================================
-- AGENT TABS CONFIGURATION
-- ============================================================================
-- Stores which tabs are enabled for each agent type (configurable per agent)
CREATE TABLE IF NOT EXISTS agent_tab_config (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  tab_id TEXT NOT NULL, -- metrics, leads, pipeline, cadence, prospecting, settings, documents, tickets
  enabled INTEGER DEFAULT 1,
  position INTEGER DEFAULT 0,
  custom_label TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(agent_id, tab_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_tabs_agent ON agent_tab_config(agent_id);
