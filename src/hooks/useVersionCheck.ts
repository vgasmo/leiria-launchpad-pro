import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const POLL_INTERVAL = 2 * 60 * 1000; // 2 minutes (was 5)

export function useVersionCheck() {
  const { t } = useTranslation();
  const initialVersion = useRef<string | null>(null);
  const hasNotified = useRef(false);

  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch(`/version.json?_=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const remote = data.version as string;

      if (initialVersion.current === null) {
        initialVersion.current = remote;
        return;
      }

      if (remote !== initialVersion.current && !hasNotified.current) {
        hasNotified.current = true;

        // Force unregister stale service workers so the new build is used
        if ('serviceWorker' in navigator) {
          try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const reg of registrations) {
              await reg.unregister();
            }
          } catch {
            // ignore SW errors
          }
        }

        // Clear all caches (Workbox / SW caches)
        if ('caches' in window) {
          try {
            const names = await caches.keys();
            await Promise.all(names.map(n => caches.delete(n)));
          } catch {
            // ignore cache errors
          }
        }

        // Show persistent, unmissable toast with clear action
        toast(
          t('app.newVersionAvailable', 'Nova versão disponível!'),
          {
            description: t(
              'app.clickToUpdate',
              'A app foi atualizada. Clique no botão para carregar a nova versão.'
            ),
            duration: Infinity,
            position: 'top-center',
            action: {
              label: t('app.updateNow', 'Atualizar agora'),
              onClick: () => {
                // Hard reload bypassing cache
                window.location.reload();
              },
            },
          },
        );

        // Auto-reload after 30 seconds if user hasn't clicked
        setTimeout(() => {
          window.location.reload();
        }, 30_000);
      }
    } catch {
      // silently ignore network errors
    }
  }, [t]);

  useEffect(() => {
    checkVersion();
    const id = setInterval(checkVersion, POLL_INTERVAL);

    const onFocus = () => checkVersion();
    window.addEventListener('focus', onFocus);

    // Listen for SW update events (Workbox prompt)
    const onControllerChange = () => {
      if (!hasNotified.current) {
        // SW updated silently — reload to pick up new assets
        window.location.reload();
      }
    };
    navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange);

    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
      navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange);
    };
  }, [checkVersion]);
}
