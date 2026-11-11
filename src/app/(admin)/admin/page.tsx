import { Card } from "@/components/ui/card";

export default function AdminDashboardPage() {
  return (
    <>
      <h1 className="text-h2">Dashboard</h1>
      <Card variant="raised" className="mt-6">
        <h2 className="text-title">Nothing to show yet</h2>
        <p className="mt-2 text-muted">
          Operators, bookings and platform reports will appear here.
        </p>
      </Card>
    </>
  );
}
