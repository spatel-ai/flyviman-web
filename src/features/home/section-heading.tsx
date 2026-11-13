import { Reveal } from "@/components/motion/reveal";

/** An eyebrow label and a section heading that resolves through slits. */
export function SectionHeading({
  id,
  overline,
  children,
}: {
  id: string;
  overline: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-overline text-muted uppercase">{overline}</p>
      <Reveal variant="slit" className="mt-3">
        <h2 id={id} className="text-h2 md:text-h1">
          {children}
        </h2>
      </Reveal>
    </div>
  );
}
