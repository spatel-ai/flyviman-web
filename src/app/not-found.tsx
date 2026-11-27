import type { Metadata } from "next";
import Link from "next/link";
import CustomerLayout from "./(customer)/layout";

export const metadata: Metadata = { title: "Page not found" };

/** Inside the customer site's header and footer, so a mistyped address has exits. */
export default function NotFound() {
  return (
    <CustomerLayout>
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <h1 className="text-h2">Page not found</h1>
        <p className="max-w-reading text-muted">
          The page you are looking for does not exist or has moved.
        </p>
        <div className="flex gap-4">
          <Link href="/" className="font-medium text-accent hover:underline">
            Go to the home page
          </Link>
          <Link
            href="/search"
            className="font-medium text-accent hover:underline"
          >
            Search flights
          </Link>
        </div>
      </div>
    </CustomerLayout>
  );
}
