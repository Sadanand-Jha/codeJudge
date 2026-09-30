-- Production observability ledger for the private /platform control center.
-- Payload columns store redacted, size-limited metadata only.

CREATE TABLE IF NOT EXISTS api_request_logs (
  id BIGSERIAL PRIMARY KEY,
  request_id VARCHAR(80) NOT NULL UNIQUE,
  trace_id VARCHAR(80) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  method VARCHAR(12) NOT NULL,
  endpoint TEXT NOT NULL,
  route_template TEXT,
  status_code INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  duration_ms INTEGER NOT NULL,
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  request_size_bytes BIGINT,
  response_size_bytes BIGINT,
  error_code TEXT,
  error_message TEXT,
  error_stack TEXT,
  service VARCHAR(80) NOT NULL DEFAULT 'api',
  environment VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_request_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_request_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_status ON api_request_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_api_logs_success ON api_request_logs(success);
CREATE INDEX IF NOT EXISTS idx_api_logs_duration ON api_request_logs(duration_ms DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_request_id ON api_request_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_trace_id ON api_request_logs(trace_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_endpoint ON api_request_logs(created_at DESC, endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_status ON api_request_logs(created_at DESC, status_code);
CREATE INDEX IF NOT EXISTS idx_api_logs_user_created ON api_request_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_success_created ON api_request_logs(success, created_at DESC);

CREATE TABLE IF NOT EXISTS api_request_metadata (
  id BIGSERIAL PRIMARY KEY,
  request_log_id BIGINT NOT NULL UNIQUE REFERENCES api_request_logs(id) ON DELETE CASCADE,
  query_params JSONB,
  path_params JSONB,
  request_body JSONB,
  response_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS application_errors (
  id BIGSERIAL PRIMARY KEY,
  error_id VARCHAR(80) NOT NULL UNIQUE,
  fingerprint VARCHAR(64) NOT NULL UNIQUE,
  request_id VARCHAR(80),
  trace_id VARCHAR(80),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  endpoint TEXT,
  method VARCHAR(12),
  error_type TEXT NOT NULL,
  error_code TEXT,
  message TEXT NOT NULL,
  stack_trace TEXT,
  status_code INTEGER,
  environment VARCHAR(40) NOT NULL,
  occurrence_count BIGINT NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_app_errors_last_seen ON application_errors(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_errors_user ON application_errors(user_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_errors_status ON application_errors(status_code, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS user_activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80),
  entity_id TEXT,
  description TEXT NOT NULL,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_activity_created ON user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_created ON user_activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_type_created ON user_activity_logs(activity_type, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_request_logs (
  id BIGSERIAL PRIMARY KEY,
  request_id VARCHAR(80) NOT NULL,
  trace_id VARCHAR(80) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  provider VARCHAR(80) NOT NULL,
  model TEXT NOT NULL,
  operation VARCHAR(80) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  duration_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  status_code INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost NUMERIC(14, 8),
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created ON ai_request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_created ON ai_request_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_model_created ON ai_request_logs(model, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_success_created ON ai_request_logs(success, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_trace ON ai_request_logs(trace_id);

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(64) NOT NULL UNIQUE,
  login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logout_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(40),
  browser VARCHAR(80),
  os VARCHAR(80),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_active_seen ON user_sessions(is_active, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_seen ON user_sessions(user_id, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS system_metrics (
  id BIGSERIAL PRIMARY KEY,
  metric_name VARCHAR(120) NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL,
  unit VARCHAR(40) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB
);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name_recorded ON system_metrics(metric_name, recorded_at DESC);
