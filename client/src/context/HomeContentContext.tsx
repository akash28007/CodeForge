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

export interface Review {
  id: string;
  name: string;
  avatarUrl: string | null;
  rating: number;
  body: string;
  order: number;
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

export interface HomePayload {
  content: HomeCopy;
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
