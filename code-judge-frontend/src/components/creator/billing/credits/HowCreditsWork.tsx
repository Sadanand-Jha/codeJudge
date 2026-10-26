"use client";


export function HowCreditsWork({
  validityMonths,
}: {
  validityMonths?: number;
}) {
  const steps = [
    {
      title: "Buy a top-up",
      body: "Pay once with UPI, card or net banking. No separate AI subscription.",
    },
    {
      title: "Credits are added",
      body: "They stack on top of your monthly plan credits right after payment.",
    },
    {
      title: "Use before they expire",
      body: validityMonths
        ? `Purchased credits stay valid for ${validityMonths} months. Plan credits refresh each month.`
        : "Purchased credits stay valid for the period shown at purchase. Plan credits refresh each month.",
    },
  ];

  return (
    <details className="group mt-8 rounded-[26px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-[22px] py-1.5 open:border-[var(--qs-ink)]">
      <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 [&::-webkit-details-marker]:hidden">
        <span className="qs-display text-[21px] font-extrabold tracking-tight">How credits work</span>
        <span className="text-sm font-bold text-[var(--qs-brand)]">
          <span className="group-open:hidden">Learn more</span>
          <span className="hidden group-open:inline">Hide</span>
        </span>
      </summary>
      <div className="grid gap-[18px] pt-1.5 pb-5 sm:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step.title} className="rounded-[16px] border-2 border-[var(--qs-line)] p-4">
            <b className="mb-2.5 grid h-[30px] w-[30px] place-items-center rounded-full bg-[var(--qs-ink)] text-sm font-extrabold text-[var(--qs-bg)]">
              {index + 1}
            </b>
            <strong className="text-[15px] font-extrabold">{step.title}</strong>
            <p className="mt-1 text-sm leading-5 text-[var(--qs-muted)]">{step.body}</p>
          </div>
        ))}
      </div>
    </details>
  );
}
