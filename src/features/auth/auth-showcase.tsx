import Image from "next/image";
import { IMAGES } from "@/content/image-credits";

/**
 * The photograph beside the sign-in and registration card on wide screens.
 * Hidden on small screens, where the form comes first.
 */
export function AuthShowcase() {
  const image = IMAGES.airAmbulance;
  return (
    <aside
      aria-hidden="true"
      className="relative hidden overflow-hidden rounded-xl lg:block"
    >
      <Image
        src={image.src}
        alt=""
        fill
        placeholder="blur"
        sizes="50vw"
        className="object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/45 to-transparent p-10 pt-32 text-white">
        <svg viewBox="0 0 200 60" className="w-40" fill="none">
          <path
            d="M8 52 Q100 -12 192 52"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="2 6"
          />
          <circle cx="8" cy="52" r="4" fill="currentColor" />
          <circle cx="192" cy="52" r="4" fill="currentColor" />
        </svg>
        <p className="mt-6 text-h2">Every way to fly.</p>
        <p className="mt-2 text-body-lg text-white/85">
          One account for flights, charters, helicopters and more.
        </p>
      </div>
    </aside>
  );
}
