import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  useHomeContent,
  type Company,
  type CourseCard,
  type HomeCopy,
  type PlatformStats,
  type Review,
  type SocialLink,
  type SocialPlatform,
  type TopicCount,
} from '../context/HomeContentContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { assetUrl } from '../utils/assetUrl';
import { toneColor, toneVar } from '../utils/tone';
import Carousel from '../components/ui/Carousel';
import Avatar from '../components/ui/Avatar';
import ReviewDialog from '../components/ReviewDialog';
import Button, { ButtonLink } from '../components/ui/Button';
import { EmptyState, ErrorState } from '../components/ui/States';
import Skeleton from '../components/ui/Skeleton';
import {
  IconArrowRight,
  IconCode,
  IconCpu,
  IconDatabase,
  IconGithub,
  IconInstagram,
  IconLayers,
  IconLinkedin,
  IconMail,
  IconPhone,
  IconSettings,
  IconStar,
  IconCalendar,
  IconCheckCircle,
  IconClipboard,
  IconTrophy,
  IconTwitter,
} from '../components/icons';

/* ── CMS value → component maps ──────────────────────────────────────────────
 * The admin picks an icon and an accent by *key*, not by class name. Tailwind only
 * emits classes it can see as literals, so these have to be full static strings —
 * building them as `bg-${accent}/10` would silently produce unstyled tiles.
 */

const cardIcons: Record<string, (p: { className?: string }) => JSX.Element> = {
  code: IconCode,
  cpu: IconCpu,
  layers: IconLayers,
  database: IconDatabase,
  settings: IconSettings,
  trophy: IconTrophy,
};

/*
 * The admin's `accent` key is now resolved to a CSS variable in `CourseTile` rather than
 * to a pair of Tailwind classes, so the class map that used to live here is gone. The
 * accepted keys are unchanged — `accent | easy | medium | hard | info` — and they still
 * have to match real `--c-*` tokens.
 */

const socialIcons: Record<SocialPlatform, (p: { className?: string }) => JSX.Element> = {
  GITHUB: IconGithub,
  LINKEDIN: IconLinkedin,
  TWITTER: IconTwitter,
  INSTAGRAM: IconInstagram,
};

const socialLabels: Record<SocialPlatform, string> = {
  GITHUB: 'GitHub',
  LINKEDIN: 'LinkedIn',
  TWITTER: 'Twitter',
  INSTAGRAM: 'Instagram',
};

/** Internal routes go through the router; anything else is a real anchor. */
function CmsLink({
  href,
  className,
  style,
  children,
}: {
  href: string;
  className?: string;
  style?: CSSProperties;
  children: React.ReactNode;
}) {
  if (href.startsWith('/')) {
    return (
      <Link to={href} className={className} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className={className} style={style}>
      {children}
    </a>
  );
}

/**
 * Paints the admin-chosen highlight word inside the headline.
 * Falls back to the plain headline if the highlight isn't actually in it, so a typo
 * in the CMS degrades to "no highlight" rather than a broken render.
 */
function Headline({ text, highlight }: { text: string; highlight: string }) {
  const at = highlight ? text.indexOf(highlight) : -1;
  if (at === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      {/* The headline is the one place besides the wordmark big enough to carry the
          gradient without it turning into decoration. */}
      <span className="text-brand-gradient">{highlight}</span>
      {text.slice(at + highlight.length)}
    </>
  );
}

/** Placeholder hero art, drawn inline so no upload or external asset is required. */
function HeroArt() {
  return (
    <svg viewBox="0 0 420 320" role="img" aria-label="Abstract illustration of a code editor" className="w-full">
      <defs>
        <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-accent))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(var(--c-accent))" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hero-ridge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-accent-soft))" stopOpacity="0.9" />
          <stop offset="100%" stopColor="rgb(var(--c-accent))" stopOpacity="0.45" />
        </linearGradient>
      </defs>

      <circle cx="300" cy="120" r="96" fill="url(#hero-sky)" />
      <circle cx="300" cy="120" r="60" fill="rgb(var(--c-accent))" opacity="0.18" />

      {/* editor panel */}
      <rect x="40" y="70" width="250" height="170" rx="12" fill="rgb(var(--c-surface))" stroke="rgb(var(--c-subtle))" />
      <circle cx="60" cy="88" r="4" fill="rgb(var(--c-hard))" opacity="0.7" />
      <circle cx="74" cy="88" r="4" fill="rgb(var(--c-medium))" opacity="0.7" />
      <circle cx="88" cy="88" r="4" fill="rgb(var(--c-easy))" opacity="0.7" />
      <path d="M40 102h250" stroke="rgb(var(--c-subtle))" />
      {[
        [120, 0.9],
        [175, 0.5],
        [95, 0.7],
        [150, 0.35],
        [70, 0.6],
      ].map(([width, opacity], i) => (
        <rect
          key={i}
          x={60}
          y={120 + i * 22}
          width={width}
          height="9"
          rx="4.5"
          fill="rgb(var(--c-accent-soft))"
          opacity={opacity}
        />
      ))}

      {/* ridge line, echoing the reference art */}
      <path d="M230 260 L290 170 L330 220 L370 160 L420 260 Z" fill="url(#hero-ridge)" />
      <path d="M180 260 L240 195 L300 260 Z" fill="rgb(var(--c-accent))" opacity="0.35" />
      <path d="M20 260h390" stroke="rgb(var(--c-subtle))" strokeWidth="2" />
    </svg>
  );
}

function CourseTile({ card }: { card: CourseCard }) {
  const Icon = cardIcons[card.icon] ?? IconCode;
  // Tone comes from the title, so a row of cards is never one colour — but the admin's
  // explicit `accent` choice still wins if they set one other than the default.
  const tone = card.accent && card.accent !== 'accent' ? `var(--c-${card.accent})` : toneVar(card.title);

  return (
    <CmsLink
      href={card.href}
      className="card-glow flex h-full flex-col rounded-xl border border-subtle bg-surface p-5 transition-colors hover:border-accent/50"
      style={{ '--glow': tone } as CSSProperties}
    >
      <span
        className="mb-4 grid h-11 w-11 place-items-center rounded-xl"
        style={{ backgroundColor: `rgb(${tone} / 0.14)`, color: `rgb(${tone})` }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="font-semibold text-primary">{card.title}</h3>
      <p className="mt-1.5 flex-1 text-sm text-secondary">{card.description}</p>
      <p className="mt-4 text-sm font-semibold" style={{ color: `rgb(${tone})` }}>
        {card.metaLabel}
      </p>
    </CmsLink>
  );
}

function Stars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const star = size === 'lg' ? 'h-5 w-5' : 'h-3.5 w-3.5';
  const label = size === 'lg' ? 'text-base' : 'text-xs';
  return (
    <span className="flex items-center gap-1.5" aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
      <span className="flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <IconStar key={n} filled={n <= rating} className={`${star} ${n <= rating ? 'text-medium' : 'text-subtle'}`} />
        ))}
      </span>
      <span className={`${label} font-bold text-primary`}>{rating.toFixed(1)}</span>
    </span>
  );
}

/**
 * Two-column testimonial card: identity on the left, the quote on the right, split by a
 * rule. Stacks to a single column below `sm`, where side-by-side would leave the quote
 * about twenty characters wide.
 */
function ReviewTile({ review }: { review: Review }) {
  return (
    <figure className="flex h-full flex-col overflow-hidden rounded-2xl border border-subtle bg-surface sm:flex-row">
      <figcaption className="flex shrink-0 flex-col items-center gap-2 p-5 text-center sm:w-44 sm:justify-center">
        {/* Reviews written by a registered user link to that profile; admin-authored rows
            have no account behind them, so they stay plain text. */}
        {review.authorUsername ? (
          <Link to={`/u/${review.authorUsername}`} className="flex flex-col items-center gap-2 hover:opacity-80">
            <Avatar name={review.name} src={review.avatarUrl} size="xl" />
            <span className="mt-1 block w-full truncate text-base font-bold text-primary underline-offset-2 hover:underline">
              {review.name}
            </span>
          </Link>
        ) : (
          <>
            <Avatar name={review.name} src={review.avatarUrl} size="xl" />
            <span className="mt-1 block w-full truncate text-base font-bold text-primary">{review.name}</span>
          </>
        )}
        {review.designation && (
          <span className="block w-full truncate text-sm text-secondary">{review.designation}</span>
        )}
        {review.verified && (
          <span
            title="This account has solved at least one problem on CodeForge"
            className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent2/10 px-2.5 py-1 text-xs font-semibold text-accent2"
          >
            <IconCheckCircle className="h-3.5 w-3.5" />
            Verified Learner
          </span>
        )}
      </figcaption>

      <div className="flex min-w-0 flex-1 flex-col border-t border-subtle p-5 sm:border-l sm:border-t-0">
        <Stars rating={review.rating} size="lg" />

        <blockquote className="relative mt-3 flex-1 pl-6 text-sm leading-relaxed text-secondary">
          <span aria-hidden="true" className="absolute left-0 top-0 font-serif text-3xl leading-none text-accent/50">
            &ldquo;
          </span>
          {review.body}
          <span aria-hidden="true" className="ml-1 font-serif text-2xl leading-none text-accent/50">
            &rdquo;
          </span>
        </blockquote>

        <div className="mt-4 flex items-center gap-2 border-t border-subtle pt-3 text-xs text-muted">
          <IconCalendar className="h-3.5 w-3.5" />
          <time dateTime={review.createdAt}>
            {new Date(review.createdAt).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </time>
        </div>
      </div>
    </figure>
  );
}

function CompanyMark({ company }: { company: Company }) {
  if (company.logoUrl) {
    // Uploaded logos are shown at full opacity and larger than before: a real logo is
    // the mark, and dimming it to sit alongside plain text made it look broken.
    return (
      <img
        src={assetUrl(company.logoUrl)}
        alt={company.name}
        className="h-9 w-auto max-w-[10rem] object-contain"
        loading="lazy"
      />
    );
  }

  /*
   * No logo uploaded: a wordmark lockup rather than a broken image.
   *
   * Third-party logos are deliberately not committed to this repository — see
   * docs/DECISIONS.md. Upload them through Admin → Homepage → Companies and this
   * renders the real thing instead.
   */
  return (
    <span className="flex items-center gap-2.5 whitespace-nowrap">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-black"
        style={{ backgroundColor: toneColor(company.name, 0.16), color: toneColor(company.name) }}
        aria-hidden="true"
      >
        {company.name.trim().charAt(0).toUpperCase()}
      </span>
      <span className="text-lg font-bold tracking-tight text-secondary">{company.name}</span>
    </span>
  );
}

function SectionHeading({ title, viewAllHref }: { title: string; viewAllHref: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className="text-xl font-bold tracking-tight text-primary sm:text-2xl">{title}</h2>
      <CmsLink
        href={viewAllHref}
        className="flex shrink-0 items-center gap-1 text-sm font-medium text-accent hover:underline"
      >
        View all
        <IconArrowRight className="h-3.5 w-3.5" />
      </CmsLink>
    </div>
  );
}

function ContactGroup({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-12 py-4">
      <Skeleton className="h-72 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** Groups digits so 111 reads as 111 and 12045 as 12,045. */
const groupDigits = (n: number) => n.toLocaleString('en-US');

/**
 * Live counters. Every figure comes from a COUNT on the real tables, so the strip is
 * allowed to be unimpressive on a fresh install rather than being padded to look busy.
 *
 * These describe the catalogue only. Submission counts are deliberately absent — see
 * docs/DECISIONS.md: with few accounts a platform-wide total is one person's activity.
 */
function StatsStrip({ heading, stats }: { heading: string; stats: PlatformStats }) {
  // Figures alternate between the two accents. One colour across four identical tiles is
  // what made this strip read as a wall of the same number.
  const cells = [
    { label: 'Problems', value: stats.problems, hint: 'every one verified against the real judge', tone: 'text-accent' },
    { label: 'Hidden test cases', value: stats.testCases, hint: 'run against every submission', tone: 'text-accent2' },
    { label: 'Topics', value: stats.topics, hint: 'from arrays to dynamic programming', tone: 'text-accent' },
    { label: 'Curated resources', value: stats.resources, hint: 'sheets, guides and learning paths', tone: 'text-accent2' },
  ];

  return (
    <section aria-label={heading}>
      <h2 className="mb-5 text-center text-sm font-semibold uppercase tracking-widest text-muted">{heading}</h2>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-subtle bg-subtle lg:grid-cols-4">
        {cells.map((c) => (
          <div key={c.label} className="flex flex-col items-center gap-1 bg-surface px-4 py-7 text-center">
            <dd className={`text-3xl font-extrabold tabular-nums sm:text-4xl ${c.tone}`}>{groupDigits(c.value)}</dd>
            <dt className="text-sm font-semibold text-primary">{c.label}</dt>
            <p className="text-xs text-muted">{c.hint}</p>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** The three-step explainer. Copy is CMS-owned; the numbering is presentational. */
function HowItWorks({ content }: { content: HomeCopy }) {
  const steps = [
    { title: content.howStep1Title, body: content.howStep1Body, icon: IconClipboard, tone: 'var(--c-tone-1)' },
    { title: content.howStep2Title, body: content.howStep2Body, icon: IconCode, tone: 'var(--c-tone-3)' },
    { title: content.howStep3Title, body: content.howStep3Body, icon: IconCpu, tone: 'var(--c-tone-6)' },
  ];

  return (
    <section aria-label={content.howHeading}>
      <h2 className="mb-8 text-center text-2xl font-extrabold tracking-tight text-primary sm:text-3xl">
        {content.howHeading}
      </h2>
      <ol className="grid gap-4 md:grid-cols-3">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className="card-glow rounded-2xl border border-subtle bg-surface p-6"
            style={
              { borderTopColor: `rgb(${step.tone})`, borderTopWidth: '2px', '--glow': step.tone } as CSSProperties
            }
          >
            {/*
             * Step numeral. Sits fully inside the card — an earlier version used negative
             * offsets and was clipped by the card's own `overflow-hidden`, which read as
             * a cropped glyph rather than a mark. Quiet, but whole.
             */}
            <span
              className="pointer-events-none absolute right-5 top-4 text-5xl font-black leading-none"
              style={{ color: `rgb(${step.tone} / 0.3)` }}
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <div className="relative flex flex-col gap-3">
            <span
              className="grid h-11 w-11 place-items-center rounded-xl"
              style={{ backgroundColor: `rgb(${step.tone} / 0.14)`, color: `rgb(${step.tone})` }}
            >
              <step.icon className="h-5 w-5" />
            </span>
              <h3 className="text-lg font-bold text-primary">{step.title}</h3>
              <p className="text-sm leading-relaxed text-secondary">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Real tag counts, linking straight into a filtered problem list. */
function TopicGrid({ heading, topics }: { heading: string; topics: TopicCount[] }) {
  if (topics.length === 0) return null;
  const busiest = topics[0].count;

  return (
    <section aria-label={heading}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-extrabold tracking-tight text-primary sm:text-3xl">{heading}</h2>
        <Link to="/problems" className="text-sm font-semibold text-accent hover:underline">
          Browse all problems →
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {topics.map((topic) => {
          // Per-topic tone, derived from the name. Sixteen tiles in one colour was the
          // thing that read as monochrome; the tone means nothing, it just differs.
          const tone = toneColor(topic.name);
          return (
            <li key={topic.name}>
              <Link
                to={`/problems?tags=${encodeURIComponent(topic.name)}`}
                className="group flex h-full flex-col justify-between gap-3 rounded-xl border border-subtle bg-surface p-4 transition-colors"
                style={{ borderTopColor: tone, borderTopWidth: '2px' }}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold capitalize text-primary">
                    {topic.name.replace(/-/g, ' ')}
                  </span>
                  <span className="shrink-0 text-xs font-bold tabular-nums" style={{ color: tone }}>
                    {topic.count}
                  </span>
                </span>
                {/* Bar length is relative to the busiest topic, so it compares rather
                    than implying some absolute target. */}
                <span className="h-1 w-full overflow-hidden rounded-full bg-raised" aria-hidden="true">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.max(8, (topic.count / busiest) * 100)}%`,
                      backgroundColor: tone,
                    }}
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * The reviews block, split out because it owns state the rest of the page does not:
 * whether the signed-in visitor already has a review, and the compose dialog.
 */
function ReviewsSection({
  reviews,
  heading,
  viewAllHref,
  onPublishedChange,
}: {
  reviews: Review[];
  heading: string;
  viewAllHref: string;
  onPublishedChange: () => void;
}) {
  const { user } = useAuth();
  const [mine, setMine] = useState<Review | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setMine(null);
      return;
    }
    let cancelled = false;
    api
      .get<Review | null>('/reviews/mine')
      .then((res) => {
        if (!cancelled) setMine(res.data ?? null);
      })
      // A failure here only costs the "you have a pending review" hint, so it stays
      // silent rather than throwing an error banner onto the landing page.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user]);

  const canWrite = Boolean(user) && (mine === null || mine.status === 'PENDING');

  return (
    <section aria-label="Reviews">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <SectionHeading title={heading} viewAllHref={viewAllHref} />
        {canWrite && (
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
            {mine ? 'Edit your review' : 'Write a review'}
          </Button>
        )}
      </div>

      {mine?.status === 'PENDING' && (
        <p className="mb-4 rounded-lg border border-medium/30 bg-medium/10 px-3 py-2 text-sm text-medium">
          Your review is waiting for an admin to approve it. You can still edit or withdraw it.
        </p>
      )}

      {reviews.length === 0 ? (
        <EmptyState title="No reviews yet" description="Be the first to share what you think." />
      ) : (
        <Carousel
          items={reviews}
          perView={2}
          label="reviews"
          cardClassName="w-[min(88vw,560px)]"
          keyOf={(r) => r.id}
          renderItem={(review) => <ReviewTile review={review} />}
        />
      )}

      <ReviewDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        existing={mine}
        onSaved={(review) => {
          setMine(review);
          onPublishedChange();
        }}
      />
    </section>
  );
}

export default function Home() {
  const { data, loading, error, reload } = useHomeContent();

  if (loading) return <HomeSkeleton />;
  if (error || !data) {
    return <ErrorState title="Couldn't load the homepage" description="The content service didn't respond." onRetry={reload} />;
  }

  const { content, courses, reviews, companies, socials, stats, topics } = data;
  const contactSocials: SocialLink[] = socials;

  return (
    <div className="flex flex-col gap-14 pb-4">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-2xl border border-subtle bg-gradient-to-br from-accent/10 via-surface to-surface">
        <div className="grid items-center gap-8 p-8 sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:p-12">
          <div>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-primary sm:text-4xl lg:text-[2.75rem]">
              <Headline text={content.heroHeadline} highlight={content.heroHighlight} />
            </h1>
            <p className="mt-4 max-w-xl text-secondary">{content.heroSubtext}</p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <ButtonLink to={content.ctaPrimaryHref} variant="primary" size="lg">
                {content.ctaPrimaryLabel}
              </ButtonLink>
              <ButtonLink to={content.ctaSecondaryHref} variant="outline" size="lg">
                {content.ctaSecondaryLabel}
                <IconCode className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink to={content.ctaTertiaryHref} variant="outline" size="lg">
                {content.ctaTertiaryLabel}
                <IconTrophy className="h-4 w-4" />
              </ButtonLink>
            </div>
          </div>

          <div className="hidden lg:block">
            {content.heroImageUrl ? (
              <img src={assetUrl(content.heroImageUrl)} alt="" className="w-full rounded-xl object-cover" />
            ) : (
              <HeroArt />
            )}
          </div>
        </div>
      </section>

      {/* ── Live numbers ─────────────────────────────────────── */}
      <StatsStrip heading={content.statsHeading} stats={stats} />

      {/* ── How it works ─────────────────────────────────────── */}
      <HowItWorks content={content} />

      {/* ── Courses ──────────────────────────────────────────── */}
      <section>
        <SectionHeading title={content.coursesHeading} viewAllHref={content.coursesViewAllHref} />
        {courses.length === 0 ? (
          <EmptyState title="No courses published yet" description="An admin hasn't added any course cards." />
        ) : (
          <Carousel
            items={courses}
            perView={4}
            label="courses"
            keyOf={(c) => c.id}
            renderItem={(card) => <CourseTile card={card} />}
          />
        )}
      </section>

      {/* ── Topics ───────────────────────────────────────────── */}
      <TopicGrid heading={content.topicsHeading} topics={topics} />

      {/* ── Reviews ──────────────────────────────────────────── */}
      <ReviewsSection
        reviews={reviews}
        heading={content.reviewsHeading}
        viewAllHref={content.reviewsViewAllHref}
        // A newly submitted review is not visible until an admin approves it, so this
        // only matters for the case where one already was.
        onPublishedChange={reload}
      />

      {/* ── Company marquee ──────────────────────────────────── */}
      {companies.length > 0 && (
        <section aria-label={content.marqueeCaption}>
          <p className="mb-5 text-center text-sm font-medium text-muted">{content.marqueeCaption}</p>
          {/* `group` lets the hover pause reach the animated track inside. */}
          <div className="marquee-viewport group relative overflow-hidden">
            {/* Edge fades, so logos dissolve rather than being chopped at the border. */}
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-canvas to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-canvas to-transparent" />
            <ul className="animate-marquee flex w-max items-center group-hover:[animation-play-state:paused]">
              {/* Rendered twice: the keyframe travels exactly -50%, so the second copy
                  is in the first copy's place at the moment the loop restarts. */}
              {[...companies, ...companies].map((company, index) => (
                <li
                  key={`${company.id}-${index}`}
                  aria-hidden={index >= companies.length}
                  // Divider on the leading edge of every item, as in the reference strip.
                  className="flex items-center border-l border-subtle px-10 first:border-l-0"
                >
                  <CompanyMark company={company} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Contact ──────────────────────────────────────────── */}
      <section id="contact" className="scroll-mt-20 rounded-2xl border border-subtle bg-surface p-8">
        <h2 className="mb-6 text-xl font-bold tracking-tight text-primary">{content.contactHeading}</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {content.contactPhone && (
            <ContactGroup icon={<IconPhone className="h-5 w-5" />} label="Phone no.">
              <a href={`tel:${content.contactPhone.replace(/\s+/g, '')}`} className="text-primary hover:text-accent">
                {content.contactPhone}
              </a>
            </ContactGroup>
          )}
          {content.contactEmail && (
            <ContactGroup icon={<IconMail className="h-5 w-5" />} label="Email">
              <a href={`mailto:${content.contactEmail}`} className="text-primary hover:text-accent">
                {content.contactEmail}
              </a>
            </ContactGroup>
          )}
          {contactSocials.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Follow us</p>
              <ul className="mt-3 flex items-center gap-3">
                {contactSocials.map((social) => {
                  const Icon = socialIcons[social.platform];
                  return (
                    <li key={social.id}>
                      <a
                        href={social.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={socialLabels[social.platform]}
                        className="grid h-10 w-10 place-items-center rounded-xl bg-raised text-secondary transition-colors hover:bg-accent/15 hover:text-accent"
                      >
                        <Icon className="h-5 w-5" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
