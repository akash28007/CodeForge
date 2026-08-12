interface IconProps {
  className?: string;
}

const base = 'w-4 h-4';

// All icons share the same stroke conventions so they sit together visually.
function Stroke({ className = base, children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/* ── brand / nav ────────────────────────────────────────────── */

/**
 * CodeForge mark — a stylized anvil+bracket. Deliberately NOT a shield (guide §1).
 * Swap this one component to replace the logo everywhere.
 */
/**
 * The supplied brand mark, served from `public/logo.png`.
 *
 * The source artwork arrived on a solid black background, which would have rendered as a
 * black rectangle on the light theme. `server/build-logo.ts` keys that background out to
 * transparency while preserving the artwork's real colours, so one asset works on both
 * grounds and no per-theme variant is needed.
 *
 * The mark is 2.7:1, so callers size it by *height* and leave the width automatic —
 * forcing it into a square box would squash it.
 */
export function LogoMark({ className = 'h-7 w-auto' }: IconProps) {
  return <img src="/logo.png" alt="" aria-hidden="true" className={className} draggable={false} />;
}

export const IconCode = ({ className }: IconProps) => (
  <Stroke className={className}>
    <polyline points="8 6 2 12 8 18" />
    <polyline points="16 6 22 12 16 18" />
  </Stroke>
);

export const IconClipboard = ({ className }: IconProps) => (
  <Stroke className={className}>
    <rect x="8" y="3" width="8" height="4" rx="1" />
    <path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
    <path d="M9 12h6M9 16h4" />
  </Stroke>
);

export const IconTrophy = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M8 4h8v4a4 4 0 0 1-8 0V4z" />
    <path d="M8 5H5a3 3 0 0 0 3 5" />
    <path d="M16 5h3a3 3 0 0 1-3 5" />
    <path d="M12 12v3" />
    <path d="M9 19h6" />
    <path d="M10 15h4l.5 4h-5z" />
  </Stroke>
);

export const IconBarChart = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Stroke>
);

/* ── actions / controls ─────────────────────────────────────── */

export const IconSearch = ({ className }: IconProps) => (
  <Stroke className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Stroke>
);

export const IconFilter = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M3 5h18l-7 8v6l-4 2v-8z" />
  </Stroke>
);

export const IconBell = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
    <path d="M10.3 21a2 2 0 0 0 3.4 0" />
  </Stroke>
);

export const IconBookmark = ({ className = base, filled = false }: IconProps & { filled?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M6 4h12v17l-6-4.5L6 21z" />
  </svg>
);

export const IconPlay = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M7 5.5v13l11-6.5-11-6.5z" />
  </svg>
);

export const IconSend = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4 20-7z" />
  </Stroke>
);

export const IconCopy = ({ className }: IconProps) => (
  <Stroke className={className}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Stroke>
);

export const IconPlus = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M12 5v14M5 12h14" />
  </Stroke>
);

export const IconTrash = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
  </Stroke>
);

export const IconSettings = ({ className }: IconProps) => (
  <Stroke className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Stroke>
);

/* ── status / verdict ───────────────────────────────────────── */

export const IconCheckCircle = ({ className }: IconProps) => (
  <Stroke className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.5l2.5 2.5 4.5-5" />
  </Stroke>
);

export const IconXCircle = ({ className }: IconProps) => (
  <Stroke className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5l5 5M14.5 9.5l-5 5" />
  </Stroke>
);

export const IconCheck = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="m5 13 4 4L19 7" />
  </Stroke>
);

export const IconX = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Stroke>
);

export const IconClock = ({ className }: IconProps) => (
  <Stroke className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </Stroke>
);

export const IconAlertTriangle = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M12 3.5 L21.5 20 H2.5 Z" />
    <path d="M12 9.5v4.5" />
    <path d="M12 17h.01" />
  </Stroke>
);

export const IconCpu = ({ className }: IconProps) => (
  <Stroke className={className}>
    <rect x="6" y="6" width="12" height="12" rx="1.5" />
    <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2 2M17.5 17.5l2 2M19.5 4.5l-2 2M6.5 17.5l-2 2" />
  </Stroke>
);

export const IconBan = ({ className }: IconProps) => (
  <Stroke className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M6 6l12 12" />
  </Stroke>
);

export const IconLoader = ({ className = base }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    className={`${className} animate-spin`}
    aria-hidden="true"
  >
    <path d="M12 3a9 9 0 1 0 9 9" />
  </svg>
);

/* ── misc ───────────────────────────────────────────────────── */

export const IconFlame = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M12 21c4 0 6.5-2.6 6.5-6 0-3-2-4.8-3-7-1 1.5-2 2-2 2 .3-3-1.5-5.5-3-6.5.5 2.5-.5 4.5-2 6-1.2 1.2-2 3-2 5.5 0 3.4 2.5 6 5.5 6z" />
  </Stroke>
);

export const IconStar = ({ className = base, filled = true }: IconProps & { filled?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={filled ? 0 : 2}
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2.5l2.9 6.1 6.6.7-4.9 4.6 1.3 6.6L12 17l-5.9 3.5 1.3-6.6-4.9-4.6 6.6-.7L12 2.5z" />
  </svg>
);

export const IconUser = ({ className }: IconProps) => (
  <Stroke className={className}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
  </Stroke>
);

export const IconPieChart = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M12 3v9h9a9 9 0 1 1-9-9z" />
    <path d="M15 3.5A9 9 0 0 1 20.5 9H15z" />
  </Stroke>
);

export const IconCalendar = ({ className }: IconProps) => (
  <Stroke className={className}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Stroke>
);

export const IconLock = ({ className }: IconProps) => (
  <Stroke className={className}>
    <rect x="5" y="10" width="14" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </Stroke>
);

export const IconSun = ({ className }: IconProps) => (
  <Stroke className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Stroke>
);

export const IconMoon = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </Stroke>
);

export const IconLogOut = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <path d="M21 12H9" />
  </Stroke>
);

export const IconChevronRight = ({ className }: IconProps) => (
  <Stroke className={className}>
    <polyline points="9 6 15 12 9 18" />
  </Stroke>
);

export const IconChevronLeft = ({ className }: IconProps) => (
  <Stroke className={className}>
    <polyline points="15 6 9 12 15 18" />
  </Stroke>
);

export const IconChevronDown = ({ className }: IconProps) => (
  <Stroke className={className}>
    <polyline points="6 9 12 15 18 9" />
  </Stroke>
);

export const IconArrowRight = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M4 12h16M14 6l6 6-6 6" />
  </Stroke>
);

export const IconExternalLink = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M14 4h6v6" />
    <path d="M20 4 10 14" />
    <path d="M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
  </Stroke>
);

export const IconMenu = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Stroke>
);

export const IconMail = ({ className }: IconProps) => (
  <Stroke className={className}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="m2.5 6.5 9.5 7 9.5-7" />
  </Stroke>
);

export const IconPhone = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
  </Stroke>
);

/* ── social ─────────────────────────────────────────────────── */

export const IconGithub = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2z" />
  </svg>
);

export const IconLinkedin = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM10 9h3.8v1.7h.05a4.2 4.2 0 0 1 3.75-2c4 0 4.75 2.6 4.75 6V21h-4v-5.3c0-1.3 0-2.9-1.8-2.9s-2.05 1.4-2.05 2.8V21h-4z" />
  </svg>
);

export const IconTwitter = ({ className = base }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M18.2 2H21l-6.5 7.4L22.5 22h-6.3l-4.9-6.4L5.6 22H2.8l7-8L1.8 2h6.4l4.4 5.9zm-1 18h1.6L7.9 3.7H6.2z" />
  </svg>
);

export const IconInstagram = ({ className }: IconProps) => (
  <Stroke className={className}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <path d="M17.5 6.5h.01" />
  </Stroke>
);

/* ── homepage course-card icons ─────────────────────────────── */

export const IconLayers = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M12 2 2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </Stroke>
);

export const IconDatabase = ({ className }: IconProps) => (
  <Stroke className={className}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5" />
    <path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" />
  </Stroke>
);
