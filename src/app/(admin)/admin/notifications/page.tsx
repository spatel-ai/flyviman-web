import type { Metadata } from "next";
import { Notifications } from "@/features/account/notifications";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <>
      <h1 className="text-h2">Notifications</h1>
      <p className="mt-2 max-w-prose text-muted">
        Updates about your work, with a link to the request or booking.
      </p>
      <div className="mt-6">
        <Notifications />
      </div>
    </>
  );
}
