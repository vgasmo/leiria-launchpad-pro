import React, { useState, useRef, useEffect } from 'react';
import { useConversations, useMessages, useSendMessage, useCreateConversation, useMarkConversationRead, Conversation } from '@/hooks/useMessaging';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Send, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface MessagingPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MessagingPanel({ open, onOpenChange }: MessagingPanelProps) {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const { data: conversations, isLoading: loadingConvs } = useConversations();
  const { data: messages } = useMessages(selectedConversation?.id);
  const sendMessage = useSendMessage();
  const markRead = useMarkConversationRead();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (selectedConversation) {
      markRead.mutate(selectedConversation.id);
    }
  }, [selectedConversation?.id]);

  // Reset selected conversation when closing
  useEffect(() => {
    if (!open) {
      setSelectedConversation(null);
    }
  }, [open]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    await sendMessage.mutateAsync({ conversationId: selectedConversation.id, content: newMessage });
    setNewMessage('');
  };

  const getConversationTitle = (conv: Conversation) => {
    if (conv.title) return conv.title;
    const others = conv.participants?.filter(p => p.user_id !== user?.id) || [];
    return others.map(p => p.profile?.full_name || p.profile?.email).join(', ') || 'Conversation';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        {selectedConversation ? (
          <>
            <SheetHeader className="border-b p-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setSelectedConversation(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <SheetTitle className="text-lg">{getConversationTitle(selectedConversation)}</SheetTitle>
              </div>
            </SheetHeader>
            <div className="flex-1 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages?.map(msg => (
                    <div key={msg.id} className={`flex gap-2 ${msg.sender_id === user?.id ? 'flex-row-reverse' : ''}`}>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={msg.sender?.avatar_url || undefined} />
                        <AvatarFallback>{msg.sender?.full_name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <div className={`max-w-[70%] rounded-lg p-3 ${msg.sender_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <div className="p-4 border-t flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <Button onClick={handleSend} disabled={sendMessage.isPending || !newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Messages
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="flex-1">
              {loadingConvs ? (
                <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}</div>
              ) : !conversations?.length ? (
                <p className="text-center text-muted-foreground py-8">No conversations yet</p>
              ) : (
                <div className="p-2 space-y-1">
                  {conversations.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className="w-full p-3 rounded-lg hover:bg-muted/50 flex items-center gap-3 text-left transition-colors"
                    >
                      <Avatar>
                        <AvatarFallback>{getConversationTitle(conv)[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{getConversationTitle(conv)}</span>
                          {(conv.unread_count || 0) > 0 && (
                            <Badge variant="default" className="ml-2">{conv.unread_count}</Badge>
                          )}
                        </div>
                        {conv.last_message && (
                          <p className="text-sm text-muted-foreground truncate">{conv.last_message.content}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
