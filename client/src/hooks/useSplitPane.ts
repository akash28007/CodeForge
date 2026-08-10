import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'codeforge_split_ratio';
const MIN = 25;
const MAX = 75;

/**
 * Draggable vertical divider. The ratio is persisted so the layout a user settles on
 * is still there next visit (guide 5: "the split ratio persists per user").
 */
export function useSplitPane(defaultRatio = 45) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(() => {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    return stored >= MIN && stored <= MAX ? stored : defaultRatio;
  });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(ratio));
  }, [ratio]);

  useEffect(() => {
    if (!dragging) return;

    function onMove(event: MouseEvent) {
      const box = containerRef.current?.getBoundingClientRect();
      if (!box) return;
      const next = ((event.clientX - box.left) / box.width) * 100;
      setRatio(Math.min(MAX, Math.max(MIN, next)));
    }
    function onUp() {
      setDragging(false);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    // Stops the browser from selecting text across the page while dragging.
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [dragging]);

  /** Keyboard access to the divider, so it isn't mouse-only. */
  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') setRatio((r) => Math.max(MIN, r - 2));
    if (event.key === 'ArrowRight') setRatio((r) => Math.min(MAX, r + 2));
  }, []);

  return { containerRef, ratio, dragging, startDrag: () => setDragging(true), onKeyDown };
}
