import { FooterColumn, Prisma, SocialPlatform } from '@prisma/client';

/**
 * Placeholder homepage content, installed on first read (and by `npm run db:seed`).
 *
 * This is the *only* place homepage copy appears as a literal. Once installed these
 * become ordinary database rows an admin edits through the CMS — the React tree never
 * falls back to them, so editing a headline in the admin panel changes the page.
 */

export const HOME_CONTENT_ID = 'singleton';

export const defaultHomeContent: Prisma.HomeContentCreateInput = {
  id: HOME_CONTENT_ID,

  heroHeadline: 'Practice with purpose. Get hired with confidence.',
  heroHighlight: 'purpose',
  heroSubtext:
    'Solve real interview problems judged in a sandboxed compiler, track every topic you master, and climb a leaderboard that rewards depth over volume.',
  heroImageUrl: null,

  ctaPrimaryLabel: 'Explore',
  ctaPrimaryHref: '/problems',
  ctaSecondaryLabel: 'Practice',
  ctaSecondaryHref: '/problems?difficulty=EASY',
  ctaTertiaryLabel: 'Compete',
  ctaTertiaryHref: '/leaderboard',

  coursesHeading: 'Explore all our courses',
  coursesViewAllHref: '/resources',
  reviewsHeading: 'Reviews',
  reviewsViewAllHref: '/leaderboard',

  marqueeCaption: 'Our learners have gone on to build at',

  contactHeading: 'Contact us details',
  contactPhone: '+91 98765 43210',
  contactEmail: 'support@codeforge.dev',

  footerTagline: 'A production-grade online judge for people who want to get genuinely good at solving problems.',
  newsletterHeading: 'Subscribe to our newsletter',
  newsletterBody: 'Stay updated with new problem sets, editorials, and platform news. No spam.',
  copyrightText: '© 2026 CodeForge. All rights reserved.',
};

export const defaultCourseCards: Prisma.CourseCardCreateManyInput[] = [
  {
    title: 'Data Structures',
    description: 'Master the fundamentals of arrays, trees, graphs, and hash maps.',
    metaLabel: '120+ Problems',
    href: '/problems?tags=arrays',
    icon: 'layers',
    accent: 'accent',
    order: 0,
  },
  {
    title: 'Algorithms',
    description: 'Sorting, searching, greedy, and dynamic programming patterns.',
    metaLabel: '200+ Problems',
    href: '/problems?tags=dynamic-programming',
    icon: 'cpu',
    accent: 'easy',
    order: 1,
  },
  {
    title: 'SQL Basics',
    description: 'Query, join, and aggregate data efficiently and correctly.',
    metaLabel: '80+ Problems',
    href: '/resources',
    icon: 'database',
    accent: 'medium',
    order: 2,
  },
  {
    title: 'System Design',
    description: 'Learn to design scalable, reliable, production-ready systems.',
    metaLabel: '60+ Problems',
    href: '/resources',
    icon: 'settings',
    accent: 'info',
    order: 3,
  },
  {
    title: 'Object-Oriented Design',
    description: 'Model real systems with clean, extensible class hierarchies.',
    metaLabel: '45+ Problems',
    href: '/resources',
    icon: 'code',
    accent: 'hard',
    order: 4,
  },
];

export const defaultReviews: Prisma.ReviewCreateManyInput[] = [
  {
    name: 'Rahul Sharma',
    rating: 5,
    body: 'This platform helped me improve my problem solving skills significantly. The hidden test cases actually catch the edge cases I used to miss. Highly recommend!',
    order: 0,
  },
  {
    name: 'Priya Verma',
    rating: 5,
    body: 'The explanations are clear and concise, and the editorial gating meant I actually tried before giving up. Best platform for interview preparation.',
    order: 1,
  },
  {
    name: 'Aman Singh',
    rating: 5,
    body: 'Loved the variety of problems and the active community support. The XP system kept me coming back every single day for two months.',
    order: 2,
  },
  {
    name: 'Neha Iyer',
    rating: 4,
    body: 'Real sandboxed judging makes the verdicts trustworthy. Time limits are strict but fair, which is exactly what you want before an interview.',
    order: 3,
  },
  {
    name: 'Karthik Menon',
    rating: 5,
    body: 'The progress page showed me I was avoiding graphs entirely. Fixed that in three weeks and cleared two on-sites.',
    order: 4,
  },
];

export const defaultCompanies: Prisma.CompanyCreateManyInput[] = [
  { name: 'Google', order: 0 },
  { name: 'Amazon', order: 1 },
  { name: 'Microsoft', order: 2 },
  { name: 'Flipkart', order: 3 },
  { name: 'Meta', order: 4 },
  { name: 'Zomato', order: 5 },
  { name: 'Adobe', order: 6 },
  { name: 'Atlassian', order: 7 },
];

export const defaultSocialLinks: Prisma.SocialLinkCreateManyInput[] = [
  { platform: SocialPlatform.GITHUB, url: 'https://github.com/', order: 0 },
  { platform: SocialPlatform.LINKEDIN, url: 'https://linkedin.com/', order: 1 },
  { platform: SocialPlatform.TWITTER, url: 'https://twitter.com/', order: 2 },
  { platform: SocialPlatform.INSTAGRAM, url: 'https://instagram.com/', order: 3 },
];

export const defaultFooterLinks: Prisma.FooterLinkCreateManyInput[] = [
  { section: FooterColumn.PLATFORM, label: 'Problems', href: '/problems', order: 0 },
  { section: FooterColumn.PLATFORM, label: 'Leaderboard', href: '/leaderboard', order: 1 },
  { section: FooterColumn.PLATFORM, label: 'Resources', href: '/resources', order: 2 },
  { section: FooterColumn.COMPANY, label: 'About Us', href: '/about', order: 0 },
  // Anchors at the homepage contact panel rather than a separate page — the details
  // it would duplicate already live there, and they come from the same CMS row.
  { section: FooterColumn.COMPANY, label: 'Contact Us', href: '/#contact', order: 1 },
  { section: FooterColumn.COMPANY, label: 'Privacy Policy', href: '/privacy', order: 2 },
  { section: FooterColumn.COMPANY, label: 'Terms of Service', href: '/terms', order: 3 },
];
