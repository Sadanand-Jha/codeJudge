interface SidebarCardProps {
  title: string;
  children: React.ReactNode;
}

export default function SidebarCard({ title, children }: SidebarCardProps) {
  return (
    <div className="border border-[#E6E7EB] bg-white">
      {/* Header */}
      <div className="border-b border-[#E6E7EB] bg-[#FAFAFB] px-3 py-1.5">
        <span className="text-[11px] font-medium text-[#2563EB]">
          → {title}
        </span>
      </div>
      {/* Body */}
      <div className="px-3 py-2">{children}</div>
    </div>
  );
}