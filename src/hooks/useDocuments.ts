import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Document {
  id: string;
  workspace_id: string;
  name: string;
  file_path: string | null;
  external_url: string | null;
  document_type: string;
  category: string | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  uploader?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useDocuments(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['documents', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch uploader profiles separately
      const uploaderIds = [...new Set(data?.map(d => d.uploaded_by).filter(Boolean) as string[])];
      let uploaders: Record<string, { id: string; full_name: string | null; avatar_url: string | null }> = {};
      
      if (uploaderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', uploaderIds);
        
        if (profiles) {
          uploaders = Object.fromEntries(profiles.map(p => [p.id, p]));
        }
      }
      
      return (data || []).map(doc => ({
        ...doc,
        uploader: doc.uploaded_by ? uploaders[doc.uploaded_by] || null : null
      })) as Document[];
    },
    enabled: !!workspaceId,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      workspaceId, 
      file, 
      category,
      description 
    }: { 
      workspaceId: string; 
      file: File; 
      category?: string;
      description?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload file to storage
      const filePath = `${workspaceId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('workspace-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { data, error } = await supabase
        .from('documents')
        .insert({
          workspace_id: workspaceId,
          name: file.name,
          file_path: filePath,
          document_type: file.type || 'application/octet-stream',
          category,
          description,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) {
        // Clean up uploaded file if record creation fails
        await supabase.storage.from('workspace-documents').remove([filePath]);
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents', variables.workspaceId] });
      toast.success('Document uploaded successfully');
    },
    onError: (error) => {
      toast.error(`Failed to upload document: ${error.message}`);
    },
  });
}

export function useAddExternalLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      workspaceId, 
      name,
      url,
      category,
      description 
    }: { 
      workspaceId: string; 
      name: string;
      url: string;
      category?: string;
      description?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('documents')
        .insert({
          workspace_id: workspaceId,
          name,
          external_url: url,
          document_type: 'link',
          category,
          description,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents', variables.workspaceId] });
      toast.success('Link added successfully');
    },
    onError: (error) => {
      toast.error(`Failed to add link: ${error.message}`);
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ document, workspaceId }: { document: Document; workspaceId: string }) => {
      // Delete file from storage if it exists
      if (document.file_path) {
        const { error: storageError } = await supabase.storage
          .from('workspace-documents')
          .remove([document.file_path]);
        
        if (storageError) {
          console.warn('Failed to delete file from storage:', storageError);
        }
      }

      // Delete document record
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', document.id);

      if (error) throw error;
      return document.id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents', variables.workspaceId] });
      toast.success('Document deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete document: ${error.message}`);
    },
  });
}

export function useGetDocumentUrl() {
  return async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from('workspace-documents')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) throw error;
    return data.signedUrl;
  };
}
