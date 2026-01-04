import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth } from 'date-fns';

/**
 * Sanitize cell content to prevent CSV formula injection attacks.
 * Cells starting with =, +, -, @, or tab could be interpreted as formulas.
 */
function sanitizeCsvCell(value: string): string {
  if (!value) return '';
  // Remove leading characters that could trigger formula evaluation
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r', '\n'];
  let sanitized = value;
  if (dangerousChars.some(char => sanitized.startsWith(char))) {
    sanitized = `'${sanitized}`; // Prefix with single quote to prevent formula execution
  }
  // Escape double quotes for CSV
  return sanitized.replace(/"/g, '""');
}
export interface KpiExportData {
  kpiName: string;
  category: string | null;
  unit: string | null;
  period: string;
  value: number | null;
  targetValue: number | null;
  notes: string | null;
}

export function useExportKpis(workspaceId: string) {
  return useQuery({
    queryKey: ['kpi-export', workspaceId],
    queryFn: async (): Promise<KpiExportData[]> => {
      // Get all KPI values with definitions
      const { data, error } = await supabase
        .from('kpi_values')
        .select(`
          value,
          target_value,
          period_month,
          notes,
          kpi_definition:kpi_definitions(name, category, unit)
        `)
        .eq('workspace_id', workspaceId)
        .order('period_month', { ascending: false });

      if (error) throw error;

      return (data || []).map(row => ({
        kpiName: (row.kpi_definition as any)?.name || 'Unknown',
        category: (row.kpi_definition as any)?.category || null,
        unit: (row.kpi_definition as any)?.unit || null,
        period: row.period_month,
        value: row.value,
        targetValue: row.target_value,
        notes: row.notes,
      }));
    },
    enabled: false, // Only fetch when needed
  });
}

export function exportToCsv(data: KpiExportData[], filename: string) {
  const headers = ['KPI Name', 'Category', 'Period', 'Value', 'Target', 'Unit', 'Notes'];
  const rows = data.map(row => [
    sanitizeCsvCell(row.kpiName),
    sanitizeCsvCell(row.category || ''),
    sanitizeCsvCell(row.period),
    row.value?.toString() || '',
    row.targetValue?.toString() || '',
    sanitizeCsvCell(row.unit || ''),
    sanitizeCsvCell(row.notes || ''),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// Session export
export interface SessionExportData {
  title: string;
  scheduledAt: string;
  duration: number | null;
  agenda: string | null;
  notes: string | null;
  decisions: string | null;
}

export function useExportSessions(workspaceId: string) {
  return useQuery({
    queryKey: ['sessions-export', workspaceId],
    queryFn: async (): Promise<SessionExportData[]> => {
      const { data, error } = await supabase
        .from('sessions')
        .select('title, scheduled_at, duration, agenda, notes, decisions')
        .eq('workspace_id', workspaceId)
        .order('scheduled_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(row => ({
        title: row.title,
        scheduledAt: row.scheduled_at,
        duration: row.duration,
        agenda: row.agenda,
        notes: row.notes,
        decisions: row.decisions,
      }));
    },
    enabled: false,
  });
}

export function exportSessionsToCsv(data: SessionExportData[], filename: string) {
  const headers = ['Title', 'Date', 'Duration (min)', 'Agenda', 'Notes', 'Decisions'];
  const rows = data.map(row => [
    sanitizeCsvCell(row.title),
    format(new Date(row.scheduledAt), 'yyyy-MM-dd HH:mm'),
    row.duration?.toString() || '',
    sanitizeCsvCell(row.agenda || ''),
    sanitizeCsvCell(row.notes || ''),
    sanitizeCsvCell(row.decisions || ''),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// Action items export
export interface ActionExportData {
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  dueDate: string | null;
  owner: string | null;
  createdAt: string;
  completedAt: string | null;
}

export function useExportActions(workspaceId: string) {
  return useQuery({
    queryKey: ['actions-export', workspaceId],
    queryFn: async (): Promise<ActionExportData[]> => {
      const { data, error } = await supabase
        .from('action_items')
        .select(`
          title,
          description,
          status,
          priority,
          due_date,
          created_at,
          completed_at,
          owner:profiles!action_items_owner_user_id_fkey(full_name, email)
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(row => ({
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        dueDate: row.due_date,
        owner: (row.owner as any)?.full_name || (row.owner as any)?.email || null,
        createdAt: row.created_at,
        completedAt: row.completed_at,
      }));
    },
    enabled: false,
  });
}

export function exportActionsToCsv(data: ActionExportData[], filename: string) {
  const headers = ['Title', 'Description', 'Status', 'Priority', 'Due Date', 'Owner', 'Created', 'Completed'];
  const rows = data.map(row => [
    sanitizeCsvCell(row.title),
    sanitizeCsvCell(row.description || ''),
    sanitizeCsvCell(row.status),
    sanitizeCsvCell(row.priority || ''),
    sanitizeCsvCell(row.dueDate || ''),
    sanitizeCsvCell(row.owner || ''),
    format(new Date(row.createdAt), 'yyyy-MM-dd'),
    row.completedAt ? format(new Date(row.completedAt), 'yyyy-MM-dd') : '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
