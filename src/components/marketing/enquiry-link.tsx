import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import type { EnquiryTopic } from "@/content/contact";

/** A link to the contact page with the enquiry topic chosen. */
export function EnquiryLink({
  topic,
  children,
  variant = "ghost",
  label,
}: {
  topic: EnquiryTopic;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  /** Names the link fully when several on a page share their text. */
  label?: string;
}) {
  return (
    <Link
      href={`/contact?topic=${topic}#enquiry`}
      aria-label={label}
      className={buttonClasses({ variant })}
    >
      {children}
    </Link>
  );
}
