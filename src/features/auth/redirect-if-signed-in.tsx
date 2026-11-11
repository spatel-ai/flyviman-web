import { redirect } from "next/navigation";
import { homeFor } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";

/** Sends a user who is already signed in to their home. Renders nothing. */
export async function RedirectIfSignedIn() {
  const session = await getSession();
  if (session) redirect(homeFor(session.role));
  return null;
}
