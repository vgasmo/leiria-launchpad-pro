import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building2, Users, Settings } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AppLayout({ children, title, subtitle, actions }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for sidebar collapse state changes
  useEffect(() => {
    const handleResize = () => {
      const sidebar = document.querySelector('aside');
      if (sidebar) {
        setSidebarCollapsed(sidebar.classList.contains('w-[72px]'));
      }
    };

    const observer = new MutationObserver(handleResize);
    const sidebar = document.querySelector('aside');
    if (sidebar) {
      observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - hidden on mobile, shown on lg+ */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>
      
      {/* Mobile bottom nav - shown only on mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom">
        <MobileBottomNav />
      </nav>
      
      <main className={cn(
        "transition-all duration-300 ease-in-out",
        // On mobile, no margin needed. On desktop, account for sidebar
        "ml-0 lg:ml-64",
        sidebarCollapsed && "lg:ml-[72px]",
        // Add bottom padding on mobile for bottom nav
        "pb-20 lg:pb-0"
      )}>
        {/* Top bar with user info - always visible */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 lg:h-16 items-center justify-between px-4 lg:px-8">
            <div className={cn(
              "transition-all duration-500 min-w-0 flex-1",
              mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
            )}>
              {title && (
                <h1 className="font-heading text-lg lg:text-xl font-semibold text-foreground truncate">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-xs lg:text-sm text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
            <div className={cn(
              "flex items-center gap-2 lg:gap-4 transition-all duration-500 delay-100 flex-shrink-0",
              mounted ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
            )}>
              {actions}
              <TopBar />
            </div>
          </div>
        </header>
        <div className={cn(
          "p-4 lg:p-8 transition-all duration-500 delay-200",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}>
          {children}
        </div>
      </main>
    </div>
  );
}

// Mobile bottom navigation
function MobileBottomNav() {
  const location = useLocation();
  
  const navItems = [
    { href: '/my-workspaces', icon: Building2, label: 'Workspaces' },
    { href: '/mentors', icon: Users, label: 'Mentors' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ];
  
  return (
    <div className="flex items-center justify-around h-16 px-2">
      {navItems.map((item) => {
        const isActive = location.pathname === item.href || 
          (item.href !== '/' && location.pathname.startsWith(item.href));
        
        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]",
              isActive 
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}