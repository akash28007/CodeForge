import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { getErrorMessage } from '../utils/errors';
import { ErrorState } from '../components/ui/States';
import { SkeletonRows } from '../components/ui/Skeleton';
import { IconChevronLeft, IconClock, IconExternalLink } from '../components/icons';

interface ResourceDetailData {
  slug: string;
  title: string;
  description: string;
  type: 'ARTICLE' | 'VIDEO' | 'SHEET' | 'EXTERNAL';
  url: string | null;
  body: string | null;
  estimatedMinutes: number | null;
  category: { slug: string; name: string };
}

/**
 * Minimal markdown renderer for admin-authored sheets.
 *
 * Deliberately small and allow-listed — headings, tables, fenced code, lists, inline
 * code and bold — rather than pulling in a full parser. Nothing is rendered as raw
 * HTML, so admin-authored content cannot inject markup into the page.
 */
function Markdown({ source }: { source: string }) {
  const blocks: JSX.Element[] = [];
  const lines = source.split('\n');
  let i = 0;
  let key = 0;

  function inline(text: string): (string | JSX.Element)[] {
    const parts: (string | JSX.Element)[] = [];
    const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g;
    let last = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      if (match.index > last) parts.push(text.slice(last, match.index));
      const token = match[0];
      if (token.startsWith('`')) {
        parts.push(
          <code key={`${key}-${match.index}`} className="rounded bg-raised px-1.5 py-0.5 font-mono text-[0.85em] text-accent">
            {token.slice(1, -1)}
          </code>,
        );
      } else {
        parts.push(
          <strong key={`${key}-${match.index}`} className="font-semibold text-primary">
            {token.slice(2, -2)}
          </strong>,
        );
      }
      last = match.index + token.length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  }

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // fenced code
    if (line.startsWith('```')) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        code.push(lines[i]);
        i++;
      }
      i++;
      blocks.push(
        <pre key={key++} className="overflow-x-auto rounded-lg border border-subtle bg-canvas p-4 font-mono text-xs text-secondary">
          {code.join('\n')}
        </pre>,
      );
      continue;
    }

    // table
    if (line.trim().startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        // Skip the |---|---| separator row.
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      blocks.push(
        <div key={key++} className="overflow-x-auto rounded-lg border border-subtle">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-raised/50 text-xs uppercase tracking-wide text-muted">
                {head.map((cell, ci) => (
                  <th key={ci} scope="col" className="px-3 py-2 font-medium">
                    {inline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, ri) => (
                <tr key={ri} className="border-t border-subtle">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-secondary">
                      {inline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // headings
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = inline(heading[2]);
      const cls =
        level <= 2 ? 'mt-2 text-lg font-bold text-primary' : 'mt-2 text-base font-semibold text-primary';
      blocks.push(
        level <= 2 ? (
          <h2 key={key++} className={cls}>
            {text}
          </h2>
        ) : (
          <h3 key={key++} className={cls}>
            {text}
          </h3>
        ),
      );
      i++;
      continue;
    }

    // unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={key++} className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-secondary">
          {items.map((item, ii) => (
            <li key={ii}>{inline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // paragraph
    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^[-*#|`]/.test(lines[i])) {
      paragraph.push(lines[i]);
      i++;
    }
    if (paragraph.length) {
      blocks.push(
        <p key={key++} className="text-sm leading-relaxed text-secondary">
          {inline(paragraph.join(' '))}
        </p>,
      );
    } else {
      i++;
    }
  }

  return <div className="flex flex-col gap-4">{blocks}</div>;
}

export default function ResourceDetail() {
  const { slug } = useParams();
  const [resource, setResource] = useState<ResourceDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    api
      .get<ResourceDetailData>(`/resources/${slug}`)
      .then((res) => setResource(res.data))
      .catch((err) => setError(getErrorMessage(err, 'Resource not found.')));
  }, [slug]);

  if (error) return <ErrorState title="Resource not found" description={error} />;
  if (!resource) return <SkeletonRows rows={5} className="h-8" />;

  return (
    <article className="mx-auto max-w-3xl">
      <Link to="/resources" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
        <IconChevronLeft className="h-4 w-4" />
        All resources
      </Link>

      <header className="mt-4 border-b border-subtle pb-5">
        <h1 className="text-2xl font-bold text-primary">{resource.title}</h1>
        <p className="mt-2 text-secondary">{resource.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>{resource.category.name}</span>
          {resource.estimatedMinutes && (
            <span className="inline-flex items-center gap-1">
              <IconClock className="h-3 w-3" />
              {resource.estimatedMinutes} min read
            </span>
          )}
        </div>
      </header>

      <div className="mt-6">
        {resource.body ? (
          <Markdown source={resource.body} />
        ) : resource.url ? (
          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-lg border border-subtle bg-surface px-4 py-3 text-sm text-primary transition-colors hover:border-accent/50"
          >
            <IconExternalLink className="h-4 w-4 text-accent" />
            Open {resource.title}
          </a>
        ) : null}
      </div>
    </article>
  );
}
