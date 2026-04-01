
-- Clean up all data related to startups cascade
DELETE FROM startup_claim_requests WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM action_items WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM activity_log WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM admin_announcements WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM ai_rate_limits WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM checkin_instances WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM checkin_definitions WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM communication_log WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM consultant_notes WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM contracts WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM conversations WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM datarooms WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM document_reviews WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM documents WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM email_log WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM financial_model_versions WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM kpi_values WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM milestones WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM sessions WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM stage_history WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM startup_contracts WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM space_allocations WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM space_waiting_list WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM staff_tasks WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM staff_work_queue_items WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM stage_gate_reviews WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM share_links WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM room_allocations WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM ritual_instances WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM reminder_jobs WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM relationship_recaps WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM payments WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM outlook_calendar_settings WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM mentor_requests WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM mentor_bookings WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM invoices WHERE workspace_id IN (SELECT id FROM workspaces);
DELETE FROM investor_updates WHERE workspace_id IN (SELECT id FROM workspaces);

-- Now delete workspace users and workspaces
DELETE FROM workspace_users;
DELETE FROM workspaces;

-- Delete startups and related
DELETE FROM cap_table_entries;
DELETE FROM funding_rounds;
DELETE FROM team_members;
DELETE FROM startups;

-- Clean founder roles (keep staff roles)
DELETE FROM user_roles WHERE role = 'founder';
