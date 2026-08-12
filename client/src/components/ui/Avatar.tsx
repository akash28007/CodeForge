import { assetUrl } from '../../utils/assetUrl';
import { toneColor } from '../../utils/tone';

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
};

export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Avatar({ name, src, size = 'md', className = '' }: AvatarProps) {
  // Resolved here rather than at every call site, so no caller can forget it.
  const resolved = assetUrl(src);

  if (resolved) {
    return (
      <img
        src={resolved}
        alt={name}
        className={`shrink-0 rounded-full object-cover ring-1 ring-subtle ${sizes[size]} ${className}`}
      />
    );
  }

  // Initials fall back to a tone derived from the name rather than one shared accent —
  // a column of identical circles was a large part of what read as monochrome.
  const tone = toneColor(name);

  return (
    <span
      aria-label={name}
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ring-1 ${sizes[size]} ${className}`}
      style={{
        backgroundColor: toneColor(name, 0.18),
        color: tone,
        // `ring` colour cannot come from a style prop, so the ring is drawn here too.
        boxShadow: `inset 0 0 0 1px ${toneColor(name, 0.35)}`,
      }}
    >
      {initialsOf(name)}
    </span>
  );
}
