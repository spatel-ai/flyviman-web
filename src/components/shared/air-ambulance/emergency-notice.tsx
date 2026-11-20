import { PhoneCall } from "lucide-react";
import { AIR_AMBULANCE } from "@/content/air-ambulance";
import { cn } from "@/lib/utils";

/**
 * The emergency-services notice at the top of every air ambulance page
 * (rule 7). Never animated: it sits outside PageTransition and Reveal.
 */
export function EmergencyNotice({ className }: { className?: string }) {
  return (
    <aside
      aria-label="Emergency"
      data-emergency-notice
      className={cn(
        "flex items-start gap-3 rounded-lg bg-danger/12 p-4 md:p-5",
        className,
      )}
    >
      <PhoneCall
        aria-hidden="true"
        className="mt-0.5 size-5 shrink-0 text-danger"
      />
      <div>
        <p className="text-body font-semibold text-foreground">
          {AIR_AMBULANCE.notice.title}
        </p>
        <p className="mt-1 max-w-reading text-body-sm text-foreground">
          {AIR_AMBULANCE.notice.text}
        </p>
      </div>
    </aside>
  );
}
