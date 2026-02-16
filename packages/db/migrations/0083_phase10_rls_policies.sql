-- Migration: 0083_phase10_rls_policies.sql
-- Phase 10: CrestAI Copilot & CrestAssist — Row-Level Security Policies

-- ai_conversations: tenant isolation
CREATE POLICY ai_conversations_tenant_isolation ON ai_conversations
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ai_messages: tenant isolation
CREATE POLICY ai_messages_tenant_isolation ON ai_messages
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- help_articles: tenant isolation OR global (NULL tenant_id)
CREATE POLICY help_articles_tenant_isolation ON help_articles
  USING (tenant_id IS NULL OR tenant_id = current_setting('app.current_tenant_id')::UUID);

-- support_tickets: tenant isolation
CREATE POLICY support_tickets_tenant_isolation ON support_tickets
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- support_ticket_comments: tenant isolation
CREATE POLICY support_ticket_comments_tenant_isolation ON support_ticket_comments
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- search_index: tenant isolation
CREATE POLICY search_index_tenant_isolation ON search_index
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
