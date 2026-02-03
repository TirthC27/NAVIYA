-- ============================================
-- NAVIYA - Agent Activity Log Schema
-- Tracks all agent task executions
-- ============================================

-- ============================================
-- DROP existing table (for fresh install)
-- ============================================
DROP TABLE IF EXISTS agent_activity_log CASCADE;

-- ============================================
-- AGENT_ACTIVITY_LOG TABLE
-- ============================================

CREATE TABLE agent_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    task_id UUID NOT NULL,
    task_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
    execution_time_ms INTEGER NOT NULL DEFAULT 0,
    summary TEXT NOT NULL,
    error_details TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================

-- For querying by user
CREATE INDEX idx_activity_log_user ON agent_activity_log(user_id);

-- For querying by agent
CREATE INDEX idx_activity_log_agent ON agent_activity_log(agent_name);

-- For querying by task
CREATE INDEX idx_activity_log_task ON agent_activity_log(task_id);

-- For querying by status
CREATE INDEX idx_activity_log_status ON agent_activity_log(status);

-- For time-based queries
CREATE INDEX idx_activity_log_created ON agent_activity_log(created_at DESC);

-- Composite index for dashboard queries
CREATE INDEX idx_activity_log_dashboard ON agent_activity_log(user_id, created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE agent_activity_log ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service full access activity_log"
    ON agent_activity_log FOR ALL
    USING (true)
    WITH CHECK (true);

-- Users can view their own activity
CREATE POLICY "Users can view own activity"
    ON agent_activity_log FOR SELECT
    USING (user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'));

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View: Recent activity summary
CREATE OR REPLACE VIEW v_recent_agent_activity AS
SELECT 
    agent_name,
    task_type,
    status,
    COUNT(*) AS execution_count,
    AVG(execution_time_ms) AS avg_execution_ms,
    MAX(created_at) AS last_execution
FROM agent_activity_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY agent_name, task_type, status
ORDER BY last_execution DESC;

-- View: Agent performance metrics
CREATE OR REPLACE VIEW v_agent_performance AS
SELECT 
    agent_name,
    COUNT(*) AS total_executions,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS successful,
    SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END) AS failed,
    ROUND(
        100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*),
        2
    ) AS success_rate,
    AVG(execution_time_ms) AS avg_execution_ms,
    MAX(execution_time_ms) AS max_execution_ms,
    MIN(created_at) AS first_execution,
    MAX(created_at) AS last_execution
FROM agent_activity_log
GROUP BY agent_name
ORDER BY total_executions DESC;

-- View: User activity feed
CREATE OR REPLACE VIEW v_user_activity_feed AS
SELECT 
    user_id,
    agent_name,
    task_type,
    status,
    summary,
    execution_time_ms,
    created_at
FROM agent_activity_log
ORDER BY created_at DESC
LIMIT 100;

-- ============================================
-- END OF ACTIVITY LOG SCHEMA
-- ============================================
