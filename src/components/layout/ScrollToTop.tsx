import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolls to top on route change.
 * Returns null — no DOM element, no ref warnings.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
