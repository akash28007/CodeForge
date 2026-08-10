import { useState } from 'react';
import { IconCheck, IconCopy } from '../../components/icons';

export default function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (insecure context / permission) — the text stays selectable.
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</h4>
        <button
          onClick={() => void copy()}
          aria-label={`Copy ${label}`}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted transition-colors hover:bg-raised hover:text-primary"
        >
          {copied ? <IconCheck className="h-3 w-3 text-easy" /> : <IconCopy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-lg border border-subtle bg-canvas p-3 font-mono text-xs text-primary">
        {value}
      </pre>
    </div>
  );
}
