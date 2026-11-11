import type { Metadata } from "next";
import { Notifications } from "@/features/account/notifications";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return (
    <>
      <h1 className="mb-6 text-h3">Notifications</h1>
      <Notifications />
    </>
  );
}
