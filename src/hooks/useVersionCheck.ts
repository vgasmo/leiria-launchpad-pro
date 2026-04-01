import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useVersionCheck() {
  const { t } = useTranslation();
  const initialVersion = useRef<string | null>(null);
  const hasNotified = useRef(false);

  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch('/version.json', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const remote = data.version as string;

      if (initialVersion.current === null) {
        initialVersion.current = remote;
        return;
      }

      if (remote !== initialVersion.current && !hasNotified.current) {
        hasNotified.current = true;
        toast(t('app.newVersionAvailable', 'Nova versão disponível.'), {
          description: t('app.clickToUpdate', 'Clique para atualizar.'),
          duration: Infinity,
          action: {
            label: '↻',
            onClick: () => window.location.reload(),
          },
        });
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

    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [checkVersion]);
}
