"use client";

export function ExpertiseSection({
  expertise,
  subjects,
  exams,
}: {
  expertise: string[];
  subjects: string[];
  exams: string[];
}) {
  const sections = [
    { label: "Expertise", items: expertise },
    { label: "Subjects", items: subjects },
    { label: "Exams", items: exams },
  ].filter((s) => s.items.length > 0);

  if (sections.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-semibold text-profile-text-primary">Expertise</h2>
      <div className="space-y-3">
        {sections.map((s) => (
          <div key={s.label}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-profile-text-muted">
              {s.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {s.items.map((item) => (
                <span
                  key={item}
                  className="rounded-md bg-profile-accent-soft px-2.5 py-1 text-[12px] font-medium text-profile-accent"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
