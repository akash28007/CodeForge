import { useParams } from 'react-router-dom';

export default function ProblemDetail() {
  const { id } = useParams();

  return (
    <div>
      <h1 className="text-2xl font-bold">Problem {id}</h1>
      <p className="text-slate-400 mt-2">
        Problem statement, code editor, and submission flow land in Milestones 5 and 6.
      </p>
    </div>
  );
}
