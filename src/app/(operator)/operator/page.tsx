import { Card } from "@/components/ui/card";

export default function OperatorDashboardPage() {
  return (
    <>
      <h1 className="text-h2">Dashboard</h1>
      <Card variant="raised" className="mt-6">
        <h2 className="text-title">Nothing to show yet</h2>
        <p className="mt-2 text-muted">
          Your aircraft, booking requests and upcoming trips will appear here.
        </p>
      </Card>
    </>
  );
}
