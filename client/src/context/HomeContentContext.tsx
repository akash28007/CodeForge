import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../services/api';

export interface HomeCopy {
  heroHeadline: string;
  heroHighlight: string;
  heroSubtext: string;
  heroImageUrl: string | null;
  ctaPrimaryLabel: string;
  ctaPrimaryHref: string;
  ctaSecondaryLabel: string;
  ctaSecondaryHref: string;
  ctaTertiaryLabel: string;
  ctaTertiaryHref: string;
  coursesHeading: string;
  coursesViewAllHref: string;
  reviewsHeading: string;
  reviewsViewAllHref: string;
  statsHeading: string;
  howHeading: string;
  howStep1Title: string;
  howStep1Body: string;
  howStep2Title: string;
  howStep2Body: string;
  howStep3Title: string;
  howStep3Body: string;
  topicsHeading: string;
  marqueeCaption: string;
  contactHeading: string;
  contactPhone: string;
  contactEmail: string;
  footerTagline: string;
  newsletterHeading: string;
  newsletterBody: string;
  copyrightText: string;
}

export interface CourseCard {
  id: string;
  title: string;
  description: string;
  metaLabel: string;
  href: string;
  icon: string;
  accent: string;
  order: number;
}

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Review {
  id: string;
  name: string;
  /** Self-described role ("Student", "SDE @ Acme"). Null on older rows. */
  designation: string | null;
  avatarUrl: string | null;
  rating: number;
  body: string;
  order: number;
  createdAt: string;
  status: ReviewStatus;
  published: boolean;
  authorId: string | null;
  /** Null for admin-authored rows, which have no account behind them. */
  authorUsername: string | null;
  /** Derived server-side from an ACCEPTED submission — never self-declared. */
  verified: boolean;
}

export interface Company {
  id: string;
  name: string;
  logoUrl: string | null;
  order: number;
}

export type SocialPlatform = 'GITHUB' | 'LINKEDIN' | 'TWITTER' | 'INSTAGRAM';

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  url: string;
  order: number;
}

export interface FooterLink {
  id: string;
  section: 'PLATFORM' | 'COMPANY';
  label: string;
  href: string;
  order: number;
}

/**
 * Live counters, computed server-side on every read — never stored, never rounded.
 * Catalogue facts only: no submission or account activity, see docs/DECISIONS.md.
 */
export interface PlatformStats {
  problems: number;
  testCases: number;
  topics: number;
  resources: number;
}

export interface TopicCount {
  name: string;
  count: number;
}

export interface HomePayload {
  content: HomeCopy;
  stats: PlatformStats;
  topics: TopicCount[];
  courses: CourseCard[];
  reviews: Review[];
  companies: Company[];
  socials: SocialLink[];
  footerLinks: FooterLink[];
}

interface HomeContentValue {
  data: HomePayload | null;
  loading: boolean;
  error: boolean;
  reload: () => void;
}

const HomeContentContext = createContext<HomeContentValue | undefined>(undefined);

/**
 * Fetches the CMS payload once per app mount.
 *
 * Lives at the app root rather than inside the Home page because the footer renders
 * on every route and reads the same document — one request serves both instead of the
 * footer refetching on every navigation.
 */
export function HomeContentProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<HomePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    api
      .get<HomePayload>('/home')
      .then((res) => setData(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  return (
    <HomeContentContext.Provider value={{ data, loading, error, reload: load }}>
      {children}
    </HomeContentContext.Provider>
  );
}

export function useHomeContent(): HomeContentValue {
  const ctx = useContext(HomeContentContext);
  if (!ctx) throw new Error('useHomeContent must be used inside HomeContentProvider');
  return ctx;
}
