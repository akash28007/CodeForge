import { useRef } from 'react';
import Editor from '@monaco-editor/react';
import { CODEFORGE_DARK } from '../services/monaco';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { IconLoader } from './icons';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  fontSize: number;
  readOnly?: boolean;
  /** Fired on Ctrl/Cmd+Enter so the page can run the code from the keyboard. */
  onRunShortcut?: () => void;
}

const TAB = '    ';

/**
 * iOS Safari zooms the viewport when a focused input's text is under 16px, which shoves
 * the layout sideways and cannot be dismissed. Editor font sizes start at 13, so on
 * touch we floor it — a slightly larger font beats a page that jumps on every tap.
 */
const MIN_TOUCH_FONT = 16;

/**
 * Touch devices get a plain textarea rather than Monaco.
 *
 * Monaco drives its own hidden textarea and manages focus itself, and on mobile
 * browsers a tap frequently fails to focus it or raise the on-screen keyboard at all —
 * the editor looks present and simply refuses to accept text. A native textarea has
 * none of that: the keyboard, caret, selection handles and clipboard are the platform's.
 * Syntax highlighting is the thing given up, which is a fair trade for being able to type.
 */
function TouchEditor({
  value,
  onChange,
  fontSize,
  readOnly,
  onRunShortcut,
}: Omit<CodeEditorProps, 'language'>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      onRunShortcut?.();
      return;
    }
    // Without this, Tab moves focus out of the editor instead of indenting.
    if (event.key === 'Tab') {
      event.preventDefault();
      const el = ref.current;
      if (!el || readOnly) return;
      const { selectionStart: start, selectionEnd: end } = el;
      const next = `${value.slice(0, start)}${TAB}${value.slice(end)}`;
      onChange(next);
      // Restore the caret after React re-renders with the new value.
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + TAB.length;
      });
    }
  }

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      readOnly={readOnly}
      // All four matter for code: phone keyboards otherwise capitalise sentences,
      // "correct" identifiers and underline everything as a spelling mistake.
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      autoComplete="off"
      // Long lines scroll instead of wrapping, matching how Monaco behaves.
      wrap="off"
      aria-label="Code editor"
      style={{ fontSize: Math.max(fontSize, MIN_TOUCH_FONT), tabSize: 4 }}
      className="h-full w-full resize-none overflow-auto bg-transparent px-3 py-3 font-mono leading-relaxed text-primary outline-none"
    />
  );
}

export default function CodeEditor({
  value,
  onChange,
  language,
  fontSize,
  readOnly = false,
  onRunShortcut,
}: CodeEditorProps) {
  // `pointer: coarse` is the primary-input test, so a touchscreen laptop still reports
  // `fine` and keeps Monaco. This targets phones and tablets specifically.
  const isTouch = useMediaQuery('(pointer: coarse)');

  if (isTouch) {
    return (
      <TouchEditor
        value={value}
        onChange={onChange}
        fontSize={fontSize}
        readOnly={readOnly}
        onRunShortcut={onRunShortcut}
      />
    );
  }

  return (
    <Editor
      value={value}
      language={language}
      theme={CODEFORGE_DARK}
      onChange={(next) => onChange(next ?? '')}
      loading={
        <div className="flex items-center gap-2 text-sm text-muted">
          <IconLoader className="h-4 w-4" />
          Loading editor…
        </div>
      }
      onMount={(editor, monaco) => {
        if (onRunShortcut) {
          editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, onRunShortcut);
        }
      }}
      options={{
        readOnly,
        fontSize,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontLigatures: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        automaticLayout: true,
        tabSize: 4,
        renderLineHighlight: 'line',
        padding: { top: 12, bottom: 12 },
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
      }}
    />
  );
}
