import { LogOut, User, Shield, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

export function TopBar() {
  const navigate = useNavigate();
  const { profile, roles, isAdmin, signOut } = useAuth();

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const displayRole = isAdmin 
    ? 'Admin' 
    : roles.includes('consultor') 
      ? 'Consultor' 
      : roles.includes('mentor_externo') 
        ? 'Mentor' 
        : roles.includes('founder') 
          ? 'Founder' 
          : 'Member';

  return (
    <div className="flex items-center gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-3 h-auto py-2 px-3 hover:bg-accent">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {displayRole}
              </p>
            </div>
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Roles
          </DropdownMenuLabel>
          <div className="px-2 py-1.5 flex flex-wrap gap-1">
            {roles.length > 0 ? (
              roles.map((role) => (
                <Badge key={role} variant="secondary" className="text-xs">
                  {role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                  {role.replace('_', ' ')}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">No roles assigned</span>
            )}
          </div>
          <DropdownMenuItem onClick={() => navigate('/settings')}>
            <Settings className="h-4 w-4 mr-2" />
            Account Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
