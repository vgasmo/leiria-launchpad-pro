-- Enable realtime for tables needed by the activity feed and dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspaces;
ALTER PUBLICATION supabase_realtime ADD TABLE public.action_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kpi_values;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;