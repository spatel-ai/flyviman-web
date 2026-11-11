import { Button } from "@/components/ui/button";
import { messageFor } from "@/lib/api/messages";

/** Shown in place of content that failed to load, with a way to try again. */
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
