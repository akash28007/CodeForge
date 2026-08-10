import { useEffect, type RefObject } from 'react';

/** Closes a popover/dropdown/modal on outside pointer press or Escape (guide §2 behavior). */
export function useDismiss(
  ref: RefObject<HTMLElement>,
  active: boolean,
  onDismiss: () => void,
  extraRef?: RefObject<HTMLElement>,
) {
  useEffect(() => {
    if (!active) return;

    function handlePointer(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (ref.current?.contains(target)) return;
      if (extraRef?.current?.contains(target)) return;
      onDismiss();
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onDismiss();
    }

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [ref, extraRef, active, onDismiss]);
}
