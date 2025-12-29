import { ReactNode, useState, useEffect } from 'react';
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
      <AppSidebar />
      <main className={cn(
        "transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "ml-[72px]" : "ml-64"
      )}>
        {/* Top bar with user info - always visible */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center justify-between px-6 lg:px-8">
            <div className={cn(
              "transition-all duration-500",
              mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
            )}>
              {title && (
                <h1 className="font-heading text-xl font-semibold text-foreground">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <div className={cn(
              "flex items-center gap-4 transition-all duration-500 delay-100",
              mounted ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
            )}>
              {actions}
              <TopBar />
            </div>
          </div>
        </header>
        <div className={cn(
          "p-6 lg:p-8 transition-all duration-500 delay-200",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}>
          {children}
        </div>
      </main>
    </div>
  );
}