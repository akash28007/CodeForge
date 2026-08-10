import Editor from '@monaco-editor/react';
import { CODEFORGE_DARK } from '../services/monaco';
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

export default function CodeEditor({
  value,
  onChange,
  language,
  fontSize,
  readOnly = false,
  onRunShortcut,
}: CodeEditorProps) {
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
