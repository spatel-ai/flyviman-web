import { EnquiryLink } from "@/components/marketing/enquiry-link";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Magnetic } from "@/components/motion/magnetic";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { PriceLabel } from "@/components/shared/price-label";
import { PILOTS } from "@/content/pilots";

/** Job assistance, courses and regulatory trainings for pilots. */
export function PilotsPage() {
  const { hero, jobs, courses, trainings } = PILOTS;
  return (
    <>
      <PageHero {...hero} />

      <section
        id="jobs"
        aria-labelledby="pilot-jobs-heading"
        className="mx-auto grid max-w-wide scroll-mt-16 gap-8 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-12 lg:gap-12 lg:px-8"
      >
        <div className="lg:col-span-5">
          <SectionHeading id="pilot-jobs-heading" overline={jobs.overline}>
            {jobs.heading}
          </SectionHeading>
        </div>
        <div className="lg:col-span-7">
          <Reveal>
            <p className="max-w-reading text-body-lg text-muted">{jobs.text}</p>
          </Reveal>
          <Magnetic className="mt-8">
            <EnquiryLink topic="PILOT_JOBS" variant="primary">
              {jobs.action}
            </EnquiryLink>
          </Magnetic>
        </div>
      </section>

      <section
        id="courses"
        aria-labelledby="pilot-courses-heading"
        className="scroll-mt-16 bg-surface"
      >
        <div className="mx-auto max-w-wide px-4 py-16 md:px-6 md:py-24 lg:px-8">
          <SectionHeading
            id="pilot-courses-heading"
            overline={courses.overline}
          >
            {courses.heading}
          </SectionHeading>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {courses.items.map((course, index) => (
              <li key={course.name}>
                <Reveal index={index} className="h-full">
                  <div className="flex h-full flex-col gap-6 rounded-xl bg-surface-raised p-6">
                    <h3 className="text-title">{course.name}</h3>
                    {/* A fee is a price: never animated, always labelled. */}
                    <PriceLabel
                      amountMinor={course.feeMinor}
                      currency="INR"
                      priceType="ESTIMATE"
                      note={courses.feeNote}
                    />
                    <div className="mt-auto">
                      <EnquiryLink
                        topic="PILOT_TRAINING"
                        label={`${courses.action}: ${course.name.toLowerCase()}`}
                      >
                        {courses.action}
                      </EnquiryLink>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="trainings"
        aria-labelledby="pilot-trainings-heading"
        className="mx-auto max-w-wide scroll-mt-16 px-4 py-16 md:px-6 md:py-24 lg:px-8"
      >
        <SectionHeading
          id="pilot-trainings-heading"
          overline={trainings.overline}
        >
          {trainings.heading}
        </SectionHeading>
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2">
          {trainings.schedule.map((item) => (
            <div key={item.label} className="flex gap-2 text-body text-muted">
              <dt>{item.label}:</dt>
              <dd className="font-medium text-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trainings.items.map((training, index) => (
            <li key={training.code}>
              <Reveal index={index % 4} className="h-full">
                <TiltCard className="h-full rounded-xl bg-surface p-6">
                  <p className="text-overline text-accent uppercase">
                    {training.code}
                  </p>
                  <h3 className="mt-4 text-title">{training.name}</h3>
                </TiltCard>
              </Reveal>
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <EnquiryLink topic="PILOT_TRAINING">{trainings.action}</EnquiryLink>
        </div>
      </section>
    </>
  );
}
