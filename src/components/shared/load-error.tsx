import { ForbiddenState } from "@/components/shared/locked-state";
import { Button } from "@/components/ui/button";
import { isForbiddenError } from "@/lib/api/errors";
import { messageFor } from "@/lib/api/messages";

/**
 * Shown in place of content that failed to load, with a way to try again.
 * A refusal (403) is not a failure that retrying can fix, so it shows the
 * locked-state card instead.
 */
export function LoadError({
  what,
  error,
  onRetry,
}: {
  /** For example "your saved passengers". */
  what: string;
  error: unknown;
  onRetry: () => void;
}) {
  if (isForbiddenError(error)) return <ForbiddenState />;
  return (
    <div role="alert" className="flex flex-col items-start gap-3">
      <p className="text-danger">
        We could not load {what}. {messageFor(error)}
      </p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
