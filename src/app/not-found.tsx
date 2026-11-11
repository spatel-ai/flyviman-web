import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="text-h2">Page not found</h1>
      <p className="max-w-reading text-muted">
        The page you are looking for does not exist or has moved.
      </p>
      <Link href="/" className="font-medium text-accent hover:underline">
        Go to the home page
      </Link>
    </main>
  );
}
