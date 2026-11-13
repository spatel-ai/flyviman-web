import { Card } from "@/components/ui/card";

/** Shown to operator staff on pages only the organisation's administrator uses. */
export function AdministratorOnly({ title }: { title: string }) {
  return (
    <>
      <h1 className="text-h2">{title}</h1>
      <Card variant="raised" className="mt-6">
        <h2 className="text-title">Managed by your administrator</h2>
        <p className="mt-2 text-muted">
          Your organisation&apos;s administrator looks after this. Ask them if
          something here needs to change.
        </p>
      </Card>
    </>
  );
}
