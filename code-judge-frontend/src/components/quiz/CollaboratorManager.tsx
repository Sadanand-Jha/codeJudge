"use client";

import { motion } from "framer-motion";
import { UserPlus, Trash2 } from "lucide-react";
import { Collaborator, CollaboratorRole } from "@/types/quiz";
import { mockUsers } from "@/mocks/users";

interface CollaboratorManagerProps {
  collaborators: Collaborator[];
  onChange: (collaborators: Collaborator[]) => void;
}

const roles: CollaboratorRole[] = ["owner", "admin", "editor", "reviewer", "moderator", "viewer"];

export default function CollaboratorManager({ collaborators, onChange }: CollaboratorManagerProps) {
  const addCollaborator = (userId: string) => {
    const user = mockUsers.find((u) => u.id === userId);
    if (!user) return;
    if (collaborators.some((c) => c.userId === userId)) return;
    onChange([
      ...collaborators,
      {
        id: `col_${Date.now()}`,
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        role: "viewer",
        addedAt: new Date().toISOString().split("T")[0],
      },
    ]);
  };

  const removeCollaborator = (id: string) => {
    onChange(collaborators.filter((c) => c.id !== id));
  };

  const updateRole = (id: string, role: CollaboratorRole) => {
    onChange(collaborators.map((c) => (c.id === id ? { ...c, role } : c)));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-[#7C3AED]" />
        <h3 className="text-sm font-semibold text-white">Collaborators</h3>
      </div>

      {/* Add collaborator */}
      <div className="flex gap-2">
        <select
          onChange={(e) => {
            if (e.target.value) addCollaborator(e.target.value);
            e.target.value = "";
          }}
          className="flex-1 h-9 rounded-lg border border-white/[0.08] bg-[#111827] px-3 text-xs text-white focus:border-[#7C3AED] focus:outline-none"
          defaultValue=""
        >
          <option value="" disabled>Add collaborator...</option>
          {mockUsers.map((user) => (
            <option key={user.id} value={user.id}>{user.username}</option>
          ))}
        </select>
      </div>

      {/* Collaborator list */}
      <div className="space-y-2">
        {collaborators.map((collab) => (
          <div key={collab.id} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#111827] p-3">
            <img src={collab.avatar} alt={collab.username} className="h-8 w-8 rounded-full bg-white/[0.06]" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{collab.username}</p>
              <p className="text-[11px] text-[#9CA3AF]">Added {collab.addedAt}</p>
            </div>

            <select
              value={collab.role}
              onChange={(e) => updateRole(collab.id, e.target.value as CollaboratorRole)}
              className="h-7 rounded-lg border border-white/[0.08] bg-[#0B0D12] px-2 text-[11px] text-white focus:border-[#7C3AED] focus:outline-none"
            >
              {roles.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>

            <button type="button"
              onClick={() => removeCollaborator(collab.id)}
              className="p-1.5 rounded-lg border border-white/[0.08] text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}