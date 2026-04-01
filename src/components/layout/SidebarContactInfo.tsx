import React, { useState } from 'react';
import { sanitizeUrl } from '@/lib/sanitizeUrl';
import { useTranslation } from 'react-i18next';
import { Mail, User, GraduationCap, Linkedin, CalendarPlus, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useNavigate } from 'react-router-dom';

interface SidebarContactInfoProps {
  workspaceId: string;
  collapsed: boolean;
  onOpenMessaging?: () => void;
}

interface ContactProfile {
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  expertise_tags?: string[] | null;
  linkedin_url?: string | null;
}

interface ContactItemProps {
  profile: ContactProfile | null;
  type: 'consultant' | 'mentor';
  collapsed: boolean;
  onOpenProfile: (data: { profile: ContactProfile; type: 'consultant' | 'mentor' }) => void;
}

const ContactItem = React.forwardRef<HTMLDivElement, ContactItemProps>(
  function ContactItem({ profile, type, collapsed, onOpenProfile }, ref) {
    const { t } = useTranslation();
    if (!profile) return null;

    const initials = profile.full_name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || (type === 'consultant' ? 'C' : 'M');

    const Icon = type === 'consultant' ? User : GraduationCap;
    const label = type === 'consultant'
      ? t('workspace.yourConsultant', { defaultValue: 'Your Consultant' })
      : t('workspace.yourMentor', { defaultValue: 'Your Mentor' });

    const bgColor = type === 'consultant' ? 'bg-primary/10' : 'bg-accent/20';
    const textColor = type === 'consultant' ? 'text-primary' : 'text-accent-foreground';

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={() => onOpenProfile({ profile, type })}
              className={cn(
                "flex items-center justify-center p-1.5 rounded-full transition-colors hover:bg-sidebar-accent cursor-pointer",
                bgColor
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className={cn("text-xs font-medium", textColor)}>
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <div className="flex items-center gap-2">
              <Icon className="h-3 w-3" />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="font-medium">{profile.full_name || t('common.noName')}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <button
        onClick={() => onOpenProfile({ profile, type })}
        className={cn(
          "rounded-lg p-3 w-full text-left transition-colors hover:ring-1 hover:ring-primary/30 cursor-pointer",
          bgColor
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <Icon className={cn("h-3.5 w-3.5", textColor)} />
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className={cn("text-xs font-medium", textColor)}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile.full_name || t('common.noName')}
            </p>
          </div>
        </div>
      </button>
    );
  }
);

interface ProfileDialogProps {
  openProfile: { profile: ContactProfile; type: 'consultant' | 'mentor' } | null;
  onClose: () => void;
  onScheduleSession: () => void;
  onSendMessage: () => void;
}

const ProfileDialog = React.forwardRef<HTMLDivElement, ProfileDialogProps>(
  function ProfileDialog({ openProfile, onClose, onScheduleSession, onSendMessage }, ref) {
    const { t } = useTranslation();
    if (!openProfile) return null;
    const { profile, type } = openProfile;
    const Icon = type === 'consultant' ? User : GraduationCap;
    const label = type === 'consultant'
      ? t('workspace.yourConsultant', { defaultValue: 'Your Consultant' })
      : t('workspace.yourMentor', { defaultValue: 'Your Mentor' });
    const textColor = type === 'consultant' ? 'text-primary' : 'text-accent-foreground';
    const initials = profile.full_name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

    return (
      <Dialog open={!!openProfile} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className={cn("h-4 w-4", textColor)} />
              {label}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className={cn("text-xl font-semibold", textColor)}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-semibold">{profile.full_name || t('common.noName')}</h3>
              {profile.bio && (
                <p className="text-sm text-muted-foreground max-w-sm">{profile.bio}</p>
              )}
            </div>

            {profile.expertise_tags && profile.expertise_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center">
                {profile.expertise_tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2 w-full mt-2">
              <Button
                variant="default"
                className="w-full"
                onClick={onScheduleSession}
              >
                <CalendarPlus className="h-4 w-4 mr-2" />
                {t('workspace.scheduleSession', { defaultValue: 'Schedule Session' })}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={onSendMessage}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                {t('common.sendMessage', { defaultValue: 'Send Message' })}
              </Button>

              {profile.email && (
                <Button variant="ghost" size="sm" className="w-full" asChild>
                  <a href={`mailto:${profile.email}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    {profile.email}
                  </a>
                </Button>
              )}

              {profile.linkedin_url && (
                <Button variant="ghost" size="sm" className="w-full" asChild>
                  <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                    <Linkedin className="h-4 w-4 mr-2" />
                    LinkedIn
                  </a>
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
);

export const SidebarContactInfo = React.forwardRef<HTMLDivElement, SidebarContactInfoProps>(function SidebarContactInfo({ workspaceId, collapsed, onOpenMessaging }, ref) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: members, isLoading } = useWorkspaceMembers(workspaceId);
  const [openProfile, setOpenProfile] = useState<{ profile: ContactProfile; type: 'consultant' | 'mentor' } | null>(null);

  const consultant = members?.find(m => m.role === 'consultor');
  const mentor = members?.find(m => m.role === 'mentor_externo');

  if (isLoading) {
    return (
      <div className={cn("mx-3 mb-3", collapsed ? "space-y-2" : "space-y-3")}>
        {collapsed ? (
          <Skeleton className="h-10 w-10 rounded-full mx-auto" />
        ) : (
          <>
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </>
        )}
      </div>
    );
  }

  if (!consultant && !mentor) {
    if (collapsed) return null;
    return (
      <div className="mx-3 mb-3 rounded-lg p-3 bg-muted/30 border border-dashed border-muted-foreground/20">
        <div className="flex items-center gap-2 text-muted-foreground">
          <User className="h-4 w-4" />
          <span className="text-xs">{t('workspace.noTeamAssigned', { defaultValue: 'Team not assigned yet' })}</span>
        </div>
      </div>
    );
  }

  const handleScheduleSession = () => {
    setOpenProfile(null);
    navigate(`/workspace/${workspaceId}?tab=agenda`);
  };

  const handleSendMessage = () => {
    setOpenProfile(null);
    onOpenMessaging?.();
  };

  return (
    <>
      <div ref={ref} className={cn(
        "mx-3 mb-3 space-y-2",
        collapsed && "flex flex-col items-center gap-2"
      )}>
        {consultant && (
          <ContactItem
            profile={consultant.profile}
            type="consultant"
            collapsed={collapsed}
            onOpenProfile={setOpenProfile}
          />
        )}
        {mentor && (
          <ContactItem
            profile={mentor.profile}
            type="mentor"
            collapsed={collapsed}
            onOpenProfile={setOpenProfile}
          />
        )}
      </div>
      <ProfileDialog
        openProfile={openProfile}
        onClose={() => setOpenProfile(null)}
        onScheduleSession={handleScheduleSession}
        onSendMessage={handleSendMessage}
      />
    </>
  );
});
