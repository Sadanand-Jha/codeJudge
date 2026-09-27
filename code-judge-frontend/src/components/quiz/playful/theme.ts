// Playful child-friendly gamified theme tokens
// Duolingo + Kahoot inspired — soft, friendly, not preschool
export const playful = {
  bg: "bg-[#FDF8FF]", // very light lavender/off-white
  bgAlt: "bg-[#F7F3FF]",
  card: "bg-white border border-[#E9E6FF] shadow-[0_8px_24px_rgba(124,58,237,0.07),0_2px_8px_rgba(0,0,0,0.04)]",
  cardRounded: "rounded-[20px] sm:rounded-[24px]",
  buttonPrimary: "bg-gradient-to-b from-[#8B5CF6] to-[#7C3AED] text-white shadow-[0_4px_0_#6D28D9,0_8px_16px_rgba(124,58,237,0.25)] hover:shadow-[0_2px_0_#6D28D9,0_6px_12px_rgba(124,58,237,0.25)] active:shadow-[0_0_0_#6D28D9] active:translate-y-[2px]",
  buttonSecondary: "bg-white border-2 border-[#E9E6FF] text-[#6D28D9] shadow-[0_3px_0_#E9E6FF] hover:shadow-[0_2px_0_#E9E6FF] active:shadow-none active:translate-y-[1px]",
  optionDefault: "bg-white border-2 border-[#E9E6FF] hover:border-[#DDD6FE] hover:shadow-[0_4px_12px_rgba(124,58,237,0.08)] hover:-translate-y-[1px]",
  optionSelected: "bg-[#F5F3FF] border-2 border-[#7C3AED] shadow-[0_4px_16px_rgba(124,58,237,0.15)]",
  optionCorrect: "bg-[#F0FDF4] border-2 border-[#22C55E] shadow-[0_4px_16px_rgba(34,197,94,0.15)]",
  optionIncorrect: "bg-[#FEF2F2] border-2 border-[#EF4444] shadow-[0_4px_16px_rgba(239,68,68,0.12)]",
  progressTrack: "bg-white border border-[#E9E6FF]",
  progressFill: "bg-gradient-to-r from-[#8B5CF6] to-[#EC4899]",
  streak: "bg-[#FFF7ED] border border-[#FDBA74] text-[#EA580C]",
  xp: "bg-[#F0FDF4] border border-[#86EFAC] text-[#16A34A]",
} as const;
