import { useEffect, useState } from 'react';

/**
 * Reads a CSS media query from JS. Needed where a Tailwind breakpoint cannot reach —
 * an inline `style` always beats a class, so a responsive value that lives in `style`
 * has to be gated here instead.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    // Guarded for SSR/prerender, where `window` does not exist.
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    // Re-read on mount: the query may have changed between render and effect, and the
    // lazy initialiser above only ran once.
    setMatches(mql.matches);

    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
