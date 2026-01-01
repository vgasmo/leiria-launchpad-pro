import React, { useState } from 'react';
import { useConsultantNotes, useCreateConsultantNote, useDeleteConsultantNote } from '@/hooks/useConsultantNotes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Lock, Unlock, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ConsultantNotesTabProps {
  workspaceId: string;
}

export function ConsultantNotesTab({ workspaceId }: ConsultantNotesTabProps) {
  const [newNote, setNewNote] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const { isConsultor, isAdmin } = useAuth();

  const { data: notes, isLoading } = useConsultantNotes(workspaceId);
  const createNote = useCreateConsultantNote();
  const deleteNote = useDeleteConsultantNote();

  const canManageNotes = isConsultor || isAdmin;

  const handleSubmit = async () => {
    if (!newNote.trim()) {
      toast.error('Please enter a note');
      return;
    }

    try {
      await createNote.mutateAsync({
        workspaceId,
        content: newNote,
        isPrivate,
      });
      setNewNote('');
      toast.success('Note added');
    } catch {
      toast.error('Failed to add note');
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await deleteNote.mutateAsync(noteId);
      toast.success('Note deleted');
    } catch {
      toast.error('Failed to delete note');
    }
  };

  if (!canManageNotes && !notes?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No notes available for this workspace.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {canManageNotes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Add Internal Note
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Write your internal note about this startup..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={4}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="private-toggle"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                />
                <Label htmlFor="private-toggle" className="flex items-center gap-1">
                  {isPrivate ? (
                    <>
                      <Lock className="h-4 w-4" />
                      Private (consultants only)
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4" />
                      Visible to workspace members
                    </>
                  )}
                </Label>
              </div>
              <Button onClick={handleSubmit} disabled={createNote.isPending || !newNote.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                {createNote.isPending ? 'Adding...' : 'Add Note'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notes History</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[500px]">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/3 bg-muted rounded" />
                      <div className="h-16 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !notes?.length ? (
              <p className="text-center text-muted-foreground py-8">
                No notes yet. {canManageNotes && 'Add the first note above.'}
              </p>
            ) : (
              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={note.author?.avatar_url || undefined} />
                      <AvatarFallback>
                        {note.author?.full_name?.[0] || note.author?.email?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {note.author?.full_name || note.author?.email || 'Unknown'}
                          </span>
                          {note.is_private && (
                            <Badge variant="secondary" className="text-xs">
                              <Lock className="h-3 w-3 mr-1" />
                              Private
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                          </span>
                          {canManageNotes && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleDelete(note.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
