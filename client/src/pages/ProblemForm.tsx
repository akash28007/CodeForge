import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/errors';

interface TestCaseInput {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

const emptyTestCase = (): TestCaseInput => ({ input: '', expectedOutput: '', isHidden: true });
const inputCls =
  'w-full bg-surface border border-subtle rounded-md px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-secondary">{label}</span>
      {children}
    </label>
  );
}

export default function ProblemForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState('EASY');
  const [statement, setStatement] = useState('');
  const [constraints, setConstraints] = useState('');
  const [inputFormat, setInputFormat] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [sampleInput, setSampleInput] = useState('');
  const [sampleOutput, setSampleOutput] = useState('');
  const [timeLimit, setTimeLimit] = useState(1000);
  const [memoryLimit, setMemoryLimit] = useState(256);
  const [tags, setTags] = useState('');
  const [editorial, setEditorial] = useState('');
  const [testCases, setTestCases] = useState<TestCaseInput[]>([emptyTestCase()]);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !id) return;
    api
      .get(`/problem/${id}`)
      .then((res) => {
        const p = res.data;
        setTitle(p.title);
        setDifficulty(p.difficulty);
        setStatement(p.statement);
        setConstraints(p.constraints);
        setInputFormat(p.inputFormat);
        setOutputFormat(p.outputFormat);
        setSampleInput(p.sampleInput);
        setSampleOutput(p.sampleOutput);
        setTimeLimit(p.timeLimit);
        setMemoryLimit(p.memoryLimit);
        setTags(p.tags.join(', '));
        setEditorial(p.editorial ?? '');
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load problem.');
        setLoading(false);
      });
  }, [id, isEdit]);

  if (!authLoading && (!user || user.role !== 'ADMIN')) {
    return <p className="text-hard">Admin access required.</p>;
  }

  function updateTestCase(index: number, patch: Partial<TestCaseInput>) {
    setTestCases((prev) => prev.map((tc, i) => (i === index ? { ...tc, ...patch } : tc)));
  }

  function addTestCase() {
    setTestCases((prev) => [...prev, emptyTestCase()]);
  }

  function removeTestCase(index: number) {
    setTestCases((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const filledTestCases = testCases.filter((tc) => tc.input.trim() && tc.expectedOutput.trim());

    const payload: Record<string, unknown> = {
      title,
      difficulty,
      statement,
      constraints,
      inputFormat,
      outputFormat,
      sampleInput,
      sampleOutput,
      timeLimit: Number(timeLimit),
      memoryLimit: Number(memoryLimit),
      tags: tagList,
      editorial: editorial.trim() || undefined,
    };
    if (!isEdit || filledTestCases.length > 0) {
      payload.testCases = filledTestCases;
    }

    try {
      if (isEdit) {
        await api.put(`/problem/${id}`, payload);
        navigate(`/problems/${id}`);
      } else {
        const res = await api.post('/problem', payload);
        navigate(`/problems/${res.data.id}`);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-secondary">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">{isEdit ? 'Edit problem' : 'New problem'}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-subtle bg-surface/60 p-6">
        <Field label="Title">
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Field>
        <Field label="Difficulty">
          <select className={inputCls} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </Field>
        <Field label="Statement">
          <textarea
            className={`${inputCls} h-24`}
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            required
          />
        </Field>
        <Field label="Constraints">
          <textarea
            className={`${inputCls} h-16`}
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Input format">
            <input
              className={inputCls}
              value={inputFormat}
              onChange={(e) => setInputFormat(e.target.value)}
              required
            />
          </Field>
          <Field label="Output format">
            <input
              className={inputCls}
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              required
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Sample input">
            <textarea
              className={`${inputCls} h-20 font-mono`}
              value={sampleInput}
              onChange={(e) => setSampleInput(e.target.value)}
              required
            />
          </Field>
          <Field label="Sample output">
            <textarea
              className={`${inputCls} h-20 font-mono`}
              value={sampleOutput}
              onChange={(e) => setSampleOutput(e.target.value)}
              required
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Time limit (ms)">
            <input
              type="number"
              className={inputCls}
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              required
              min={1}
            />
          </Field>
          <Field label="Memory limit (MB)">
            <input
              type="number"
              className={inputCls}
              value={memoryLimit}
              onChange={(e) => setMemoryLimit(Number(e.target.value))}
              required
              min={1}
            />
          </Field>
        </div>
        <Field label="Tags (comma-separated)">
          <input className={inputCls} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="arrays, dp" />
        </Field>

        <Field label="Editorial (optional — shown only when a user deliberately opens it)">
          <textarea
            className={`${inputCls} h-28`}
            value={editorial}
            onChange={(e) => setEditorial(e.target.value)}
            placeholder="Explain the intended approach, complexity, and common pitfalls."
          />
        </Field>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-secondary text-sm">
              Test cases {isEdit && '(leave blank to keep the existing ones)'}
            </h2>
            <button type="button" onClick={addTestCase} className="text-accent text-sm hover:underline">
              + Add test case
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {testCases.map((tc, i) => (
              <div key={i} className="border border-subtle rounded-lg p-3 bg-canvas/40">
                <div className="grid grid-cols-2 gap-3">
                  <textarea
                    className={`${inputCls} h-16 font-mono`}
                    placeholder="Input"
                    value={tc.input}
                    onChange={(e) => updateTestCase(i, { input: e.target.value })}
                  />
                  <textarea
                    className={`${inputCls} h-16 font-mono`}
                    placeholder="Expected output"
                    value={tc.expectedOutput}
                    onChange={(e) => updateTestCase(i, { expectedOutput: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <label className="flex items-center gap-2 text-sm text-secondary">
                    <input
                      type="checkbox"
                      checked={tc.isHidden}
                      onChange={(e) => updateTestCase(i, { isHidden: e.target.checked })}
                    />
                    Hidden
                  </label>
                  {testCases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTestCase(i)}
                      className="text-hard text-sm hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-hard text-sm">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="bg-accent hover:bg-accent-soft disabled:opacity-50 rounded-md px-4 py-2 font-medium text-white shadow-glow self-start transition-colors"
        >
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create problem'}
        </button>
      </form>
    </div>
  );
}
