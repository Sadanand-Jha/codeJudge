"use client";

import { motion } from "framer-motion";
import { DiscoveryPermissions, QuizPermission } from "@/types/quiz";

interface PermissionToggleProps {
  permissions: DiscoveryPermissions;
  onChange: (permissions: DiscoveryPermissions) => void;
}

const permissionConfig: Array<{ key: QuizPermission; label: string; description: string }> = [
  { key: "view", label: "View", description: "Who can view this quiz" },
  { key: "attempt", label: "Attempt", description: "Who can attempt this quiz" },
  { key: "comment", label: "Comment", description: "Who can comment" },
  { key: "discuss", label: "Discuss", description: "Who can participate in discussions" },
  { key: "share", label: "Share", description: "Who can share this quiz" },
  { key: "rate", label: "Rate", description: "Who can rate this quiz" },
  { key: "bookmark", label: "Bookmark", description: "Who can bookmark this quiz" },
  { key: "clone", label: "Clone", description: "Who can clone this quiz" },
  { key: "edit", label: "Edit", description: "Who can edit this quiz" },
];

export default function PermissionToggle({ permissions, onChange }: PermissionToggleProps) {
  const toggle = (key: QuizPermission) => {
    onChange({ ...permissions, [key]: !permissions[key] });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-white">Discovery Permissions</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {permissionConfig.map((perm) => (
          <label key={perm.key} className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#111827] p-3 cursor-pointer">
            <div>
              <p className="text-xs font-semibold text-white">{perm.label}</p>
              <p className="text-[11px] text-[#9CA3AF]">{perm.description}</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                toggle(perm.key);
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                permissions[perm.key] ? "bg-[#7C3AED]" : "bg-white/10"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                  permissions[perm.key] ? "translate-x-4" : "translate-x-1"
                }`}
              />
            </button>
          </label>
        ))}
      </div>
    </motion.div>
  );
}
