import React from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, User, GraduationCap } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';

interface SidebarContactInfoProps {
  workspaceId: string;
  collapsed: boolean;
}

export const SidebarContactInfo = React.forwardRef<HTMLDivElement, SidebarContactInfoProps>(function SidebarContactInfo({ workspaceId, collapsed }, ref) {
  const { t } = useTranslation();
  const { data: members, isLoading } = useWorkspaceMembers(workspaceId);

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

  // If no consultant and no mentor, show a placeholder for the founder to know this area exists
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

  const ContactItem = ({ 
    profile, 
    type 
  }: { 
    profile: { full_name?: string | null; email?: string | null; avatar_url?: string | null } | null;
    type: 'consultant' | 'mentor';
  }) => {
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
            <a 
              href={profile.email ? `mailto:${profile.email}` : undefined}
              className={cn(
                "flex items-center justify-center p-1.5 rounded-full transition-colors hover:bg-sidebar-accent",
                bgColor
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className={cn("text-xs font-medium", textColor)}>
                  {initials}
                </AvatarFallback>
              </Avatar>
            </a>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <div className="flex items-center gap-2">
              <Icon className="h-3 w-3" />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="font-medium">{profile.full_name || t('common.noName')}</p>
            {profile.email && (
              <p className="text-xs text-muted-foreground">{profile.email}</p>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <div className={cn("rounded-lg p-3", bgColor)}>
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
          {profile.email && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  asChild
                >
                  <a href={`mailto:${profile.email}`}>
                    <Mail className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{t('common.sendEmail', { defaultValue: 'Send email' })}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    );
  };

  return (
    <div ref={ref} className={cn(
      "mx-3 mb-3 space-y-2",
      collapsed && "flex flex-col items-center gap-2"
    )}>
      {consultant && <ContactItem profile={consultant.profile} type="consultant" />}
      {mentor && <ContactItem profile={mentor.profile} type="mentor" />}
    </div>
  );
});
