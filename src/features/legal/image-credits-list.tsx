import Image from "next/image";
import { IMAGES, LICENCE_URLS } from "@/content/image-credits";

/** Every photograph on the site with its photographer, source and licence. */
export function ImageCreditsList() {
  return (
    <ul className="mt-10 grid gap-6 sm:grid-cols-2">
      {Object.values(IMAGES).map((image) => (
        <li key={image.sourceUrl} className="flex gap-4">
          <div className="relative aspect-3/2 w-32 shrink-0 overflow-hidden rounded-md bg-surface">
            <Image
              src={image.src}
              alt=""
              fill
              sizes="128px"
              className="object-cover"
            />
          </div>
          <div className="text-body-sm">
            <p>{image.alt}</p>
            <p className="mt-1 text-muted">
              Photograph by {image.photographer} on{" "}
              <a
                href={image.sourceUrl}
                rel="noreferrer"
                aria-label={`${image.source}, ${image.photographer}'s photograph`}
                className="text-accent hover:underline"
              >
                {image.source}
              </a>
              ,{" "}
              <a
                href={LICENCE_URLS[image.licence]}
                rel="noreferrer"
                aria-label={`${image.licence}, ${image.photographer}'s photograph`}
                className="text-accent hover:underline"
              >
                {image.licence}
              </a>
              .
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
