import type { Metadata } from "next";
import { PageTransition } from "@/components/motion/page-transition";
import { ContactPage } from "@/features/contact/contact-page";

export const metadata: Metadata = {
  title: "Contact us",
  description:
    "Call, email or send Flyviman an enquiry. Head corporate office in Gurugram.",
};

export default function Page() {
  return (
    <PageTransition>
      <ContactPage />
    </PageTransition>
  );
}
