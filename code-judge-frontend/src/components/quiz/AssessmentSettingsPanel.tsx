"use client";

import { motion } from "framer-motion";
import { AssessmentSettings, DEFAULT_ASSESSMENT_SETTINGS } from "@/types/quiz";
import { Settings2 } from "lucide-react";

interface AssessmentSettingsPanelProps {
  settings: AssessmentSettings;
  onChange: (settings: AssessmentSettings) => void;
}

export default function AssessmentSettingsPanel({ settings, onChange }: AssessmentSettingsPanelProps) {
  const update = (field: keyof AssessmentSettings, value: any) => {
    onChange({ ...settings, [field]: value });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-[#7C3AED]" />
        <h3 className="text-sm font-semibold text-white">Assessment Settings</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-[#9CA3AF]">Passing Score (%)</label>
          <input
            type="number"
            value={settings.passingScore}
            onChange={(e) => update("passingScore", Number(e.target.value))}
            min="0"
            max="100"
            className="w-full h-9 rounded-lg border border-white/[0.08] bg-[#0B0D12] px-3 text-xs text-white focus:border-[#7C3AED] focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[#9CA3AF]">Attempts Allowed</label>
          <input
            type="number"
            value={settings.attemptsAllowed}
            onChange={(e) => update("attemptsAllowed", Number(e.target.value))}
            min="1"
            className="w-full h-9 rounded-lg border border-white/[0.08] bg-[#0B0D12] px-3 text-xs text-white focus:border-[#7C3AED] focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[#9CA3Af]">Time Limit (minutes)</label>
          <input
            type="number"
            value={settings.timeLimit || 30}
            onChange={(e) => update("timeLimit", Number(e.target.value))}
            min="1"
            className="w-full h-9 rounded-lg border border-white/[0.08] bg-[#0B0D12] px-3 text-xs text-white focus:border-[#7C3AED] focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[#9CA3Aff]">Negative Marking</label>
          <select
            value={settings.negativeMarking ? "yes" : "no"}
            onChange={(e) => update("negativeMarking", e.target.value === "yes")}
            className="w-full h-9 rounded-lg border border-white/[0.08] bg-[#0B0D12] px-3 text-xs text-white focus:border-[#7C3AED] focus:outline-none"
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
          {settings.negativeMarking && (
            <input
              type="number"
              value={settings.negativeMarkValue}
              onChange={(e) => update("negativeMarkValue", Number(e.target.value))}
              min="0"
              max="100"
              placeholder="Penalty per wrong answer (%)"
              className="w-full h-7 rounded-lg border border-white/[0.08] bg-[#09090B] px-2 text-[11px] text-white focus:border-[#7C3AED] focus:outline-none mt-1"
            />
          )}
        </div>
      </div>

      <div className="space-y-2">
        {[
          { key: "randomizeQuestions" as const, label: "Randomize Questions" },
          { key: "randomizeOptions" as const, label: "Randomize Options" },
          { key: "canRevisit" as const, label: "Allow Revisiting Questions" },
          { key: "enableLeaderboard" as const, label: "Enable Leaderboard" },
          { key: "enableCertificate" as const, label: "Enable Certificate" },
          { key: "enableDiscussion" as const, label: "Enable Discussion" },
          { key: "enableBookmarks" as const, label: "Enable Bookmarks" },
          { key: "practiceMode" as const, label: "Practice Mode" },
        ].map((item) => (
          <label key={item.key} className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#0B0D12] p-3 cursor-pointer">
            <span className="text-xs font-medium text-white">{item.label}</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                update(item.key, !settings[item.key]);
              }}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                settings[item.key] ? "bg-[#7C3AED]" : "bg-white/10"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                  settings[item.key] ? "translate-x-4" : "translate-x-1"
                }`}
              />
            </button>
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-medium text-[#9CA3Af]">Lifelines</h4>
        {settings.lifelines.map((lifeline, index) => (
          <div key={lifeline.type} className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#0B0D12] p-3">
            <div>
              <p className="text-xs font-semibold text-white">{lifeline.label}</p>
              <p className="text-[11px] text-[#9CA3AF]">{lifeline.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={lifeline.maxUses}
                onChange={(e) => {
                  const lifelines = [...settings.lifelines];
                  lifelines[index] = { ...lifelines[index], maxUses: Math.max(0, Number(e.target.value)) };
                  update("lifelines", lifelines);
                }}
                min="0"
                disabled={!lifeline.enabled}
                className="w-12 h-7 rounded-lg border border-white/[0.08] bg-[#09090B] px-1 text-[11px] text-white focus:border-[#7C3AED] focus:outline-none disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => {
                  const lifelines = [...settings.lifelines];
                  lifelines[index] = { ...lifelines[index], enabled: !lifeline.enabled };
                  update("lifelines", lifelines);
                }}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  lifeline.enabled ? "bg-[#7C3AED]" : "bg-white/10"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    lifeline.enabled ? "translate-x-4" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
