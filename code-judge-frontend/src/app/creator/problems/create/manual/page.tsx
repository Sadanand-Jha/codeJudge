import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ManualProblemCreator } from "@/components/creator/problems/ManualProblemCreator";

export default function CreateProblemManualRoute() {
  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-4xl">
            Create Problem Manually
          </h1>
          <p className="mt-1.5 text-sm text-[var(--qs-muted)]">
            Write your own problem from scratch — statement, options and answer key.
          </p>
        </div>
        <Link href="/creator/problems" className="qs-btn qs-btn-ghost w-full px-4 py-2.5 text-sm sm:w-auto">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Problems
        </Link>
      </div>

      <div className="mt-6">
        <ManualProblemCreator />
      </div>
    </div>
  );
}
