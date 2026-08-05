export default function FilterProblemsWidget() {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-medium text-text-secondary">Difficulty:</label>
      <div className="flex items-center gap-1">
        <input
          type="text"
          placeholder="Min"
          className="w-full rounded border border-border bg-card px-2 py-1 text-[11px] text-text-primary placeholder-text-muted outline-none focus:border-accent/40"
        />
        <span className="text-[11px] text-text-muted">—</span>
        <input
          type="text"
          placeholder="Max"
          className="w-full rounded border border-border bg-card px-2 py-1 text-[11px] text-text-primary placeholder-text-muted outline-none focus:border-accent/40"
        />
      </div>
      <div className="text-right">
        <button className="text-[10px] text-accent hover:underline">Add tag</button>
      </div>
      <div className="flex justify-center pt-1">
        <button className="rounded border border-border bg-card px-6 py-1 text-[11px] text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors">
          Apply
        </button>
      </div>
    </div>
  );
}
