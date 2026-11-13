import { Reveal } from "@/components/motion/reveal";

/**
 * An eyebrow label and a section heading that resolves through slits. Used
 * by every customer marketing page.
 */
export function SectionHeading({
  id,
  overline,
  children,
}: {
  id: string;
  overline?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {overline ? (
        <p className="mb-3 text-overline text-muted uppercase">{overline}</p>
      ) : null}
      <Reveal variant="slit">
        <h2 id={id} className="text-h2 md:text-h1">
          {children}
        </h2>
      </Reveal>
    </div>
  );
}
