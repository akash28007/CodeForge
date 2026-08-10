import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useHomeContent, type FooterLink, type SocialPlatform } from '../context/HomeContentContext';
import { getErrorMessage } from '../utils/errors';
import Button from './ui/Button';
import { IconGithub, IconInstagram, IconLinkedin, IconTwitter, LogoMark } from './icons';

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

function LinkColumn({ title, links }: { title: string; links: FooterLink[] }) {
  if (links.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-primary">{title}</h3>
      <ul className="mt-3 flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.id}>
            {link.href.startsWith('/') ? (
              <Link to={link.href} className="text-sm text-secondary transition-colors hover:text-accent">
                {link.label}
              </Link>
            ) : (
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
                className="text-sm text-secondary transition-colors hover:text-accent"
              >
                {link.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Real signup — validates, posts, and reports what actually happened. */
function NewsletterForm({ heading, body }: { heading: string; body: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setState('saving');
    try {
      await api.post('/newsletter', { email: email.trim() });
      setState('done');
      setEmail('');
    } catch (err) {
      // The server is the authority on what counts as a valid address; surfacing its
      // message keeps the two from disagreeing.
      setError(getErrorMessage(err, 'Could not subscribe. Please try again.'));
      setState('idle');
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-primary">{heading}</h3>
      <p className="mt-3 text-sm text-secondary">{body}</p>

      {state === 'done' ? (
        <p role="status" className="mt-4 rounded-lg border border-easy/40 bg-easy/10 px-3 py-2 text-sm text-easy">
          Thanks — you&apos;re subscribed.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'newsletter-error' : undefined}
            className={`min-w-0 flex-1 rounded-lg border bg-surface px-3 py-2 text-sm text-primary outline-none transition-colors placeholder:text-muted ${
              error ? 'border-hard focus:border-hard' : 'border-subtle focus:border-accent'
            }`}
          />
          <Button type="submit" size="sm" loading={state === 'saving'} className="sm:px-4">
            Subscribe
          </Button>
        </form>
      )}

      {error && (
        <p id="newsletter-error" className="mt-2 text-xs text-hard">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Site footer (guide §3.6). Every string and link is CMS content — it reads the same
 * payload the homepage does, via the shared provider, so there is no second request.
 *
 * Renders nothing at all while that payload is loading or failed: an empty five-column
 * skeleton at the bottom of every page would be worse than no footer.
 */
export default function Footer() {
  const { data } = useHomeContent();
  if (!data) return null;

  const { content, socials, footerLinks } = data;
  const platform = footerLinks.filter((l) => l.section === 'PLATFORM');
  const company = footerLinks.filter((l) => l.section === 'COMPANY');

  return (
    <footer className="mt-16 border-t border-subtle bg-surface/60">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2 lg:col-span-1">
          <Link to="/" className="flex items-center gap-2" aria-label="CodeForge home">
            <LogoMark className="h-7 w-7" />
            <span className="text-lg font-extrabold tracking-tight text-primary">CodeForge</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm text-secondary">{content.footerTagline}</p>
        </div>

        <LinkColumn title="Platform" links={platform} />
        <LinkColumn title="Company" links={company} />

        {socials.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-primary">Follow Us</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {socials.map((social) => {
                const Icon = socialIcons[social.platform];
                return (
                  <li key={social.id}>
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center gap-2 text-sm text-secondary transition-colors hover:text-accent"
                    >
                      <Icon className="h-4 w-4" />
                      {socialLabels[social.platform]}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="sm:col-span-2 lg:col-span-1">
          <NewsletterForm heading={content.newsletterHeading} body={content.newsletterBody} />
        </div>
      </div>

      <div className="border-t border-subtle">
        <p className="mx-auto max-w-[1400px] px-4 py-4 text-xs text-muted">{content.copyrightText}</p>
      </div>
    </footer>
  );
}
