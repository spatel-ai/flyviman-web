import Link from "next/link";
import { buttonClasses } from "@/components/ui/button-classes";
import { AIR_AMBULANCE } from "@/content/air-ambulance";
import { getSession } from "@/lib/auth/session";
import { RequestForm } from "./request-form";

/**
 * The form for a signed-in customer; a way to sign in for a visitor. Decided
 * on the server, so the form never flashes for the wrong person. Reads the
 * session, so it sits inside <Suspense>.
 */
export async function RequestGate() {
  const session = await getSession();
  if (!session) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-lg bg-surface p-6">
        <p className="max-w-reading text-body">{AIR_AMBULANCE.signIn.text}</p>
        <Link
          href={`/login?next=${encodeURIComponent("/air-ambulance")}`}
          className={buttonClasses({ variant: "primary" })}
        >
          {AIR_AMBULANCE.signIn.action}
        </Link>
      </div>
    );
  }
  if (session.role !== "CUSTOMER") {
    return (
      <p className="rounded-lg bg-surface p-6 text-body">
        {AIR_AMBULANCE.notCustomer}
      </p>
    );
  }
  return <RequestForm />;
}
