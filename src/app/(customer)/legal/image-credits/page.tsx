import type { Metadata } from "next";
import Image from "next/image";
import { IMAGES, LICENCE_URLS } from "@/content/image-credits";

export const metadata: Metadata = { title: "Image credits" };

export default function ImageCreditsPage() {
  return (
    <div className="mx-auto w-full max-w-content px-4 py-12 md:px-6 md:py-16">
      <h1 className="text-h1">Image credits</h1>
      <p className="mt-4 max-w-reading text-body-lg text-muted">
        The photographs on this site set the scene. They do not show the
        aircraft you would fly on: each operator&apos;s own photographs appear
        with their aircraft.
      </p>
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
                  className="text-accent hover:underline"
                >
                  {image.source}
                </a>
                ,{" "}
                <a
                  href={LICENCE_URLS[image.licence]}
                  rel="noreferrer"
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
    </div>
  );
}
