"use client";

import SafeHTML from "./SafeHTML";
import SectionTitle from "./SectionTitle";

interface ProblemStatementProps {
  title: string;
  statement: string;
  inputSpecification: string;
  outputSpecification: string;
  constraints: string | null;
  notes: string | null;
}

export default function ProblemStatement({
  statement,
  inputSpecification,
  outputSpecification,
  constraints,
  notes,
}: ProblemStatementProps) {
  return (
    <div className="space-y-10">
      {/* Statement */}
      <section>
        <SafeHTML html={statement} />
      </section>

      {/* Input */}
      <section>
        <SectionTitle>Input</SectionTitle>
        <SafeHTML html={inputSpecification} />
      </section>

      {/* Output */}
      <section>
        <SectionTitle>Output</SectionTitle>
        <SafeHTML html={outputSpecification} />
      </section>

      {/* Constraints */}
      {constraints && (
        <section>
          <SectionTitle>Constraints</SectionTitle>
          <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-5 py-4">
            <SafeHTML html={constraints} />
          </div>
        </section>
      )}

      {/* Notes */}
      {notes && (
        <section>
          <SectionTitle>Note</SectionTitle>
          <SafeHTML html={notes} />
        </section>
      )}
    </div>
  );
}