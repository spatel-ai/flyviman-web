"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api/client";
import { messageFor } from "@/lib/api/messages";
import { queryKeys } from "@/lib/api/query-keys";
import type { Schemas } from "@/lib/api/types";
import { upload } from "./upload";

type Media = Schemas["AircraftMediaResponseDto"];

const KINDS = [
  { value: "PHOTO", label: "Photo" },
  { value: "FLOOR_PLAN", label: "Floor plan" },
];

/** A short-lived link to one stored image; refetched before it lapses. */
function Thumbnail({ media }: { media: Media }) {
  const [failed, setFailed] = useState(0);
  const link = useQuery({
    queryKey: queryKeys.fileDownload(media.fileId),
    queryFn: () =>
      apiFetch<Schemas["DownloadLinkResponseDto"]>(
        `documents/${encodeURIComponent(media.fileId)}/download`,
      ),
    // Refetch a little before the signed link lapses, whatever its lifetime.
    staleTime: (query) => {
      const expiresAt = query.state.data?.data.expiresAt;
      return expiresAt
        ? Math.max(0, Date.parse(expiresAt) - Date.now() - 30_000)
        : 0;
    },
  });
  const alt = `${media.kind === "FLOOR_PLAN" ? "Floor plan" : "Photo"}: ${media.fileName}`;
  const frame =
    "flex aspect-3/2 w-full items-center justify-center rounded-md bg-surface text-caption text-muted";
  // A link that lapsed while the page was open is fetched once more; a
  // second failure is shown rather than retried for ever.
  if (link.isError || failed > 1) {
    return <div className={frame}>Image could not be shown</div>;
  }
  if (!link.data) return <div className={frame}>Loading image</div>;
  return (
    <Image
      src={link.data.data.url}
      alt={alt}
      width={240}
      height={160}
      unoptimized
      loading="eager"
      onError={() => {
        setFailed((count) => count + 1);
        if (failed === 0) void link.refetch();
      }}
      className="aspect-3/2 w-full rounded-md bg-surface object-cover"
    />
  );
}

/**
 * Photos and floor plans. They never send an approved aircraft back to
 * review; they cannot change while it is under review or suspended.
 */
export function AircraftPhotos({
  base,
  media,
  canAdd,
  canRemove,
  onChanged,
}: {
  base: string;
  media: Media[];
  canAdd: boolean;
  canRemove: boolean;
  onChanged: () => Promise<void>;
}) {
  const [kind, setKind] = useState("PHOTO");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Media | null>(null);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const file = new FormData(formElement).get("file");
    if (!(file instanceof File) || file.size === 0) return;
    setPending(true);
    setError(null);
    try {
      const fileId = await upload(
        file,
        kind === "FLOOR_PLAN" ? "AIRCRAFT_FLOOR_PLAN" : "AIRCRAFT_PHOTO",
      );
      await apiFetch(`${base}/media`, {
        method: "POST",
        body: { fileId, kind },
      });
      formElement.reset();
      await onChanged();
    } catch (failure) {
      setError(messageFor(failure));
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!removing) return;
    setPending(true);
    setError(null);
    try {
      await apiFetch(`${base}/media/${encodeURIComponent(removing.id)}`, {
        method: "DELETE",
      });
      setRemoving(null);
      await onChanged();
    } catch (failure) {
      setRemoving(null);
      setError(messageFor(failure));
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="photos-heading">
      <h2 id="photos-heading" className="text-title">
        Photos and floor plans
      </h2>
      {error ? (
        <p role="alert" className="mt-2 text-body-sm text-danger">
          {error}
        </p>
      ) : null}
      {media.length === 0 ? (
        <p className="mt-2 text-body-sm text-muted">
          No photos yet. Customers see these once the aircraft is approved.
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {media.map((item) => (
            <li key={item.id} className="flex flex-col gap-1.5">
              <Thumbnail media={item} />
              <div className="flex items-center justify-between gap-2 text-caption">
                <span className="truncate text-muted">
                  {item.kind === "FLOOR_PLAN" ? "Floor plan" : "Photo"} ·{" "}
                  {item.fileName}
                </span>
                {canRemove ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setRemoving(item)}
                    aria-label={`Remove ${item.fileName}`}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {canAdd ? (
        <form
          onSubmit={(event) => void add(event)}
          className="mt-4 flex max-w-lg flex-col gap-4"
        >
          <Select
            label="Kind"
            options={KINDS}
            value={kind}
            onValueChange={setKind}
          />
          <Input
            label="Image"
            name="file"
            type="file"
            accept="image/jpeg,image/png"
            hint="JPEG or PNG, up to 10 MB."
            required
          />
          <Button type="submit" variant="secondary" loading={pending}>
            Add image
          </Button>
        </form>
      ) : null}
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remove this image?"
        description="It is deleted and no longer shown."
        confirmLabel="Remove"
        destructive
        loading={pending}
        onConfirm={() => void remove()}
      />
    </section>
  );
}
