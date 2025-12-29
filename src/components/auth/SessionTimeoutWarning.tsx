import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface SessionTimeoutWarningProps {
  warningTimeMs?: number; // Time before timeout to show warning (default: 5 minutes)
  timeoutMs?: number; // Total inactivity timeout (default: 30 minutes)
}

export function SessionTimeoutWarning({
  warningTimeMs = 5 * 60 * 1000, // 5 minutes
  timeoutMs = 30 * 60 * 1000, // 30 minutes
}: SessionTimeoutWarningProps) {
  const { signOut } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const resetActivity = useCallback(() => {
    setLastActivity(Date.now());
    setShowWarning(false);
  }, []);

  // Track user activity
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      if (!showWarning) {
        setLastActivity(Date.now());
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [showWarning]);

  // Check for timeout
  useEffect(() => {
    const checkTimeout = setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivity;
      const timeUntilTimeout = timeoutMs - timeSinceActivity;

      if (timeUntilTimeout <= 0) {
        // Session timed out
        signOut();
      } else if (timeUntilTimeout <= warningTimeMs && !showWarning) {
        // Show warning
        setShowWarning(true);
        setCountdown(Math.ceil(timeUntilTimeout / 1000));
      }

      if (showWarning) {
        setCountdown(Math.max(0, Math.ceil(timeUntilTimeout / 1000)));
      }
    }, 1000);

    return () => clearInterval(checkTimeout);
  }, [lastActivity, timeoutMs, warningTimeMs, showWarning, signOut]);

  const handleContinue = () => {
    resetActivity();
  };

  const handleLogout = () => {
    signOut();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Session Timeout Warning
          </AlertDialogTitle>
          <AlertDialogDescription>
            Your session will expire in <strong className="text-foreground">{formatTime(countdown)}</strong> due to inactivity.
            <br /><br />
            Click "Continue Session" to stay logged in.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleLogout}>
            Log Out
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleContinue}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Continue Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
