import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IconChevronLeft, IconChevronRight } from '../icons';

interface CarouselProps<T> {
  items: T[];
  /** How many cards are visible at the widest breakpoint (guide §3.2 = 4, §3.3 = 3). */
  perView: number;
  /** Overrides the narrow-screen card width for cards that need more room. */
  cardClassName?: string;
  renderItem: (item: T, index: number) => ReactNode;
  keyOf: (item: T) => string;
  label: string;
}

/**
 * Horizontal card carousel that advances one page at a time.
 *
 * Scrolling is real overflow scrolling with CSS scroll-snap rather than a transform
 * offset, which means touch swipe and keyboard scrolling work for free and the arrows
 * are only a convenience on top. `perView` sets the card width via a CSS variable so
 * the same component drives both the 4-up course row and the 3-up review row.
 */
export default function Carousel<T>({
  items,
  perView,
  renderItem,
  keyOf,
  label,
  cardClassName = 'w-[min(80vw,320px)]',
}: CarouselProps<T>) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // Arrows disable themselves at the ends. Recomputed on scroll and on resize, since
  // how many cards fit changes with the viewport.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      setAtStart(track.scrollLeft <= 1);
      setAtEnd(track.scrollLeft >= max - 1);
    };

    update();
    track.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(track);
    return () => {
      track.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [items.length]);

  function page(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth, behavior: 'smooth' });
  }

  const arrowClass =
    'grid h-9 w-9 shrink-0 place-items-center rounded-full border border-subtle bg-surface text-secondary transition-colors hover:border-muted hover:text-primary disabled:cursor-not-allowed disabled:opacity-30';

  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={() => page(-1)}
        disabled={atStart}
        aria-label={`Previous ${label}`}
        className={`${arrowClass} hidden sm:grid`}
      >
        <IconChevronLeft className="h-4 w-4" />
      </button>

      <ul
        ref={trackRef}
        // `--per-view` drives the card basis; the min() keeps cards readable on narrow
        // screens by showing fewer of them rather than shrinking them indefinitely.
        style={{ ['--per-view' as string]: perView }}
        className="flex flex-1 snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, index) => (
          <li
            key={keyOf(item)}
            className={`${cardClassName} shrink-0 snap-start lg:w-[calc((100%-(var(--per-view)-1)*1rem)/var(--per-view))]`}
          >
            {renderItem(item, index)}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => page(1)}
        disabled={atEnd}
        aria-label={`Next ${label}`}
        className={arrowClass}
      >
        <IconChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
