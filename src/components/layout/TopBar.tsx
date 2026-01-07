import { LogOut, Shield, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { GlobalSearchInput } from '@/components/search/GlobalSearchInput';

export function TopBar() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { profile, roles, isAdmin, signOut } = useAuth();

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const displayRole = isAdmin 
    ? t('roles.admin')
    : roles.includes('consultor') 
      ? t('roles.consultor')
      : roles.includes('mentor_externo') 
        ? t('roles.mentor_externo')
        : roles.includes('founder') 
          ? t('roles.founder')
          : t('roles.team_member');

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {/* Global Search - hidden on small mobile */}
      <div className="hidden sm:block">
        <GlobalSearchInput />
      </div>
      
      {/* Language Selector - hidden on mobile */}
      <div className="hidden md:block">
        <LanguageSelector />
      </div>
      
      {/* Theme Toggle */}
      <ThemeToggle className="text-muted-foreground" />

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-3 h-auto py-2 px-3 hover:bg-accent/50 rounded-lg transition-all duration-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {displayRole}
              </p>
            </div>
            <Avatar className="h-9 w-9 ring-2 ring-border transition-all duration-200 hover:ring-primary/50">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 animate-scale-in">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {t('topBar.roles')}
          </DropdownMenuLabel>
          <div className="px-2 py-1.5 flex flex-wrap gap-1">
            {roles.length > 0 ? (
              roles.map((role) => (
                <Badge key={role} variant="secondary" className="text-xs capitalize">
                  {role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                  {t(`roles.${role}`, role.replace('_', ' '))}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">{t('topBar.noRoles')}</span>
            )}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
            <Settings className="h-4 w-4 mr-2" />
            {t('topBar.accountSettings')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive cursor-pointer">
            <LogOut className="h-4 w-4 mr-2" />
            {t('auth.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}