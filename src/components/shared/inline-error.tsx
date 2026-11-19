import { Button } from "@/components/ui/button";

/** An error shown where the content would be, with a way to try again. */
export function InlineError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-sm bg-danger/12 px-3.5 py-2.5 text-body-sm text-danger"
    >
      <p>{message}</p>
      {onRetry ? (
        <Button variant="secondary" className="h-10" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
