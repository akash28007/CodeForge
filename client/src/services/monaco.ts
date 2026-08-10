import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
// monaco-editor 0.56 ships an `exports` map that rewrites `monaco-editor/*` to
// `esm/vs/*`, so this specifier deliberately omits the `esm/vs` prefix.
import editorWorker from 'monaco-editor/editor/editor.worker.js?worker';

/**
 * Point @monaco-editor/react at the bundled copy of Monaco instead of its default CDN.
 * The CDN default would break a deployment behind a strict CSP (and offline dev), so the
 * editor is served from our own bundle.
 *
 * Only the base editor worker is registered — C++ highlighting is Monarch-based and needs
 * no language service worker.
 */
declare global {
  interface Window {
    MonacoEnvironment?: monaco.Environment;
  }
}

window.MonacoEnvironment = {
  getWorker: () => new editorWorker(),
};

loader.config({ monaco });

/** Editor theme matching the app's dark surface tokens. */
export const CODEFORGE_DARK = 'codeforge-dark';

monaco.editor.defineTheme(CODEFORGE_DARK, {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6b6f80', fontStyle: 'italic' },
    { token: 'keyword', foreground: '818cf8' },
    { token: 'string', foreground: '12a877' },
    { token: 'number', foreground: 'cf8a09' },
    { token: 'type', foreground: '60a5fa' },
  ],
  colors: {
    'editor.background': '#0d0e12',
    'editor.foreground': '#e8e9ed',
    'editorLineNumber.foreground': '#454956',
    'editorLineNumber.activeForeground': '#a1a4b2',
    'editor.lineHighlightBackground': '#16171d',
    'editor.selectionBackground': '#6366f155',
    'editorCursor.foreground': '#818cf8',
    'editorIndentGuide.background1': '#262832',
  },
});
