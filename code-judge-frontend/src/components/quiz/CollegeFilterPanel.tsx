"use client";

import { motion } from "framer-motion";
import { CollegeFilter } from "@/types/quiz";
import { mockColleges } from "@/mocks/quizVisibility";

interface CollegeFilterPanelProps {
  filter: CollegeFilter;
  onChange: (filter: CollegeFilter) => void;
}

export default function CollegeFilterPanel({ filter, onChange }: CollegeFilterPanelProps) {
  const toggleArrayItem = (field: "collegeIds" | "departments" | "years" | "sections", value: string) => {
    const current = filter[field] || [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onChange({ ...filter, [field]: next });
  };

  const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
  const allDepartments = Array.from(new Set(mockColleges.flatMap((c) => c.departments)));
  const allSections = ["A", "B", "C", "D", "All"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">College</label>
        <div className="flex flex-wrap gap-2">
          {mockColleges.map((college) => {
            const selected = filter.collegeIds.includes(college.id);
            return (
              <button
                key={college.id}
                type="button"
                onClick={() => toggleArrayItem("collegeIds", college.id)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  selected
                    ? "border-[#EC4899] bg-[#EC4899]/15 text-[#EC4899]"
                    : "border-border-hover bg-card text-muted-foreground hover:border-border-hover"
                }`}
              >
                {college.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Department</label>
        <div className="flex flex-wrap gap-2">
          {allDepartments.map((dept) => {
            const selected = filter.departments.includes(dept);
            return (
              <button
                key={dept}
                type="button"
                onClick={() => toggleArrayItem("departments", dept)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  selected
                    ? "border-[#EC4899] bg-[#EC4899]/15 text-[#EC4899]"
                    : "border-border-hover bg-card text-muted-foreground hover:border-border-hover"
                }`}
              >
                {dept}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Year</label>
        <div className="flex flex-wrap gap-2">
          {years.map((year) => {
            const selected = filter.years.includes(year);
            return (
              <button
                key={year}
                type="button"
                onClick={() => toggleArrayItem("years", year)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  selected
                    ? "border-[#EC4899] bg-[#EC4899]/15 text-[#EC4899]"
                    : "border-border-hover bg-card text-muted-foreground hover:border-border-hover"
                }`}
              >
                {year}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Section</label>
        <div className="flex flex-wrap gap-2">
          {allSections.map((section) => {
            const selected = filter.sections.includes(section);
            return (
              <button
                key={section}
                type="button"
                onClick={() => toggleArrayItem("sections", section)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  selected
                    ? "border-[#EC4899] bg-[#EC4899]/15 text-[#EC4899]"
                    : "border-border-hover bg-card text-muted-foreground hover:border-border-hover"
                }`}
              >
                {section}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}