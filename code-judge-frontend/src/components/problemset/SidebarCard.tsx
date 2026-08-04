interface SidebarCardProps {
  title: string;
  children: React.ReactNode;
}

export default function SidebarCard({ title, children }: SidebarCardProps) {
  return (
    <div className="border border-border bg-card">
      {/* Header */}
      <div className="border-b border-border bg-card-hover px-3 py-1.5">
        <span className="text-[11px] font-medium text-accent">
          → {title}
        </span>
      </div>
      {/* Body */}
      <div className="px-3 py-2">{children}</div>
    </div>
  );
}
