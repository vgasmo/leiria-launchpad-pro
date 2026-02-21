import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBadge() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-destructive px-4 py-3 text-destructive-foreground shadow-lg animate-in slide-in-from-bottom-4 fade-in">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span className="text-sm font-medium">
        You are offline. Changes will be saved locally when you reconnect.
      </span>
    </div>
  );
}
