import { useTranslation } from 'react-i18next';
import { Mail, Phone, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';

interface ResponsibleConsultantCardProps {
  workspaceId: string;
}

export function ResponsibleConsultantCard({ workspaceId }: ResponsibleConsultantCardProps) {
  const { t } = useTranslation();
  const { data: members, isLoading } = useWorkspaceMembers(workspaceId);

  const consultant = members?.find(m => m.role === 'consultor');

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary" />
            {t('workspace.responsibleConsultant', 'Your Consultant')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!consultant) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary" />
            {t('workspace.responsibleConsultant', 'Your Consultant')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('workspace.noConsultantAssigned', 'No consultant assigned yet. Contact the program team for assistance.')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const profile = consultant.profile;
  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'C';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="h-4 w-4 text-primary" />
          {t('workspace.responsibleConsultant', 'Your Consultant')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{profile?.full_name || t('common.noName', 'No name')}</p>
            <p className="text-sm text-muted-foreground truncate">{profile?.email}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {profile?.email && (
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <a href={`mailto:${profile.email}`}>
                <Mail className="h-4 w-4 mr-1" />
                {t('common.email', 'Email')}
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
