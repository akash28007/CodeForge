import { EmptyState } from './ui/States';
import { ButtonLink } from './ui/Button';
import { IconCode } from './icons';

/**
 * Placeholder for routes whose real implementation lands in a later build-order step.
 * Deliberately shows no invented data — it states plainly that the page isn't built yet,
 * so nothing here can be mistaken for a working feature.
 */
export default function UnderConstruction({ page, step }: { page: string; step: string }) {
  return (
    <EmptyState
      icon={<IconCode />}
      title={`${page} isn't built yet`}
      description={`This page is scheduled for ${step} of the UI/UX build order. It's linked here so navigation is complete, but it holds no real data yet.`}
      action={
        <ButtonLink to="/problems" variant="outline" size="sm">
          Go to Problems
        </ButtonLink>
      }
    />
  );
}
