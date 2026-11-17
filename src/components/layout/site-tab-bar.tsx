import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { MobileTabBar, MobileTabBarView } from "./mobile-tab-bar";

async function TabBar() {
  // A public page must still render when the API cannot be reached.
  const session = await getSession().catch(() => null);
  return <MobileTabBar signedIn={session !== null} />;
}

/** The phone tab bar; the account tab streams in like the header's. */
export function SiteTabBar() {
  return (
    <Suspense fallback={<MobileTabBarView signedIn={false} pathname={null} />}>
      <TabBar />
    </Suspense>
  );
}
