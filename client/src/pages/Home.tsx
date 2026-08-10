import { Link } from 'react-router-dom';
import {
  useHomeContent,
  type Company,
  type CourseCard,
  type Review,
  type SocialLink,
  type SocialPlatform,
} from '../context/HomeContentContext';
import Carousel from '../components/ui/Carousel';
import { ButtonLink } from '../components/ui/Button';
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

const cardAccents: Record<string, string> = {
  accent: 'bg-accent/10 text-accent',
  easy: 'bg-easy/10 text-easy',
  medium: 'bg-medium/10 text-medium',
  hard: 'bg-hard/10 text-hard',
  info: 'bg-info/10 text-info',
};

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
function CmsLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  if (href.startsWith('/')) {
    return (
      <Link to={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className={className}>
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
      <span className="text-accent">{highlight}</span>
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
  const accent = cardAccents[card.accent] ?? cardAccents.accent;

  return (
    <CmsLink
      href={card.href}
      className="flex h-full flex-col rounded-xl border border-subtle bg-surface p-5 transition-colors hover:border-accent/50"
    >
      <span className={`mb-4 grid h-11 w-11 place-items-center rounded-xl ${accent}`}>
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="font-semibold text-primary">{card.title}</h3>
      <p className="mt-1.5 flex-1 text-sm text-secondary">{card.description}</p>
      <p className="mt-4 text-sm font-semibold text-accent">{card.metaLabel}</p>
    </CmsLink>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-1.5" aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
      <span className="flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <IconStar
            key={n}
            filled={n <= rating}
            className={`h-3.5 w-3.5 ${n <= rating ? 'text-medium' : 'text-subtle'}`}
          />
        ))}
      </span>
      <span className="text-xs font-semibold text-secondary">{rating.toFixed(1)}</span>
    </span>
  );
}

function ReviewTile({ review }: { review: Review }) {
  const initials = review.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <figure className="flex h-full flex-col rounded-xl border border-subtle bg-surface p-5">
      <figcaption className="flex items-center gap-3">
        {review.avatarUrl ? (
          <img src={review.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <span className="grid h-10 w-10 place-items-center rounded-full bg-raised text-xs font-bold text-secondary">
            {initials}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate font-semibold text-primary">{review.name}</span>
          <Stars rating={review.rating} />
        </span>
      </figcaption>
      <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-secondary">{review.body}</blockquote>
    </figure>
  );
}

function CompanyMark({ company }: { company: Company }) {
  if (company.logoUrl) {
    return <img src={company.logoUrl} alt={company.name} className="h-7 w-auto object-contain opacity-70" />;
  }
  // No logo uploaded: render the name as a wordmark rather than a broken image.
  return <span className="whitespace-nowrap text-lg font-bold tracking-tight text-muted">{company.name}</span>;
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

export default function Home() {
  const { data, loading, error, reload } = useHomeContent();

  if (loading) return <HomeSkeleton />;
  if (error || !data) {
    return <ErrorState title="Couldn't load the homepage" description="The content service didn't respond." onRetry={reload} />;
  }

  const { content, courses, reviews, companies, socials } = data;
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
              <img src={content.heroImageUrl} alt="" className="w-full rounded-xl object-cover" />
            ) : (
              <HeroArt />
            )}
          </div>
        </div>
      </section>

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

      {/* ── Reviews ──────────────────────────────────────────── */}
      <section>
        <SectionHeading title={content.reviewsHeading} viewAllHref={content.reviewsViewAllHref} />
        {reviews.length === 0 ? (
          <EmptyState title="No reviews yet" description="An admin hasn't published any reviews." />
        ) : (
          <Carousel
            items={reviews}
            perView={3}
            label="reviews"
            keyOf={(r) => r.id}
            renderItem={(review) => <ReviewTile review={review} />}
          />
        )}
      </section>

      {/* ── Company marquee ──────────────────────────────────── */}
      {companies.length > 0 && (
        <section aria-label={content.marqueeCaption}>
          <p className="mb-5 text-center text-sm font-medium text-muted">{content.marqueeCaption}</p>
          {/* `group` lets the hover pause reach the animated track inside. */}
          <div className="marquee-viewport group relative overflow-hidden">
            {/* Edge fades, so logos dissolve rather than being chopped at the border. */}
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-canvas to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-canvas to-transparent" />
            <ul className="animate-marquee flex w-max items-center gap-14 group-hover:[animation-play-state:paused]">
              {/* Rendered twice: the keyframe travels exactly -50%, so the second copy
                  is in the first copy's place at the moment the loop restarts. */}
              {[...companies, ...companies].map((company, index) => (
                <li key={`${company.id}-${index}`} aria-hidden={index >= companies.length}>
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
