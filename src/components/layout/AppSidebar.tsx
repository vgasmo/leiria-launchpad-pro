import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Building2,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const navigation = [
  { name: 'My Workspaces', href: '/my-workspaces', icon: Building2 },
];

const adminNavigation = [
  { name: 'Admin Panel', href: '/admin', icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const { profile, isAdmin, signOut } = useAuth();

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 gradient-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <LayoutDashboard className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-sm font-semibold text-sidebar-foreground">
              Startup Leiria
            </h1>
            <p className="text-xs text-sidebar-foreground/60">Mentorship</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.name}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="my-4 h-px bg-sidebar-border" />
              {adminNavigation.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User section */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/30 p-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {profile?.email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
