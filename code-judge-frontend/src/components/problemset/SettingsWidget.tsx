export default function SettingsWidget() {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-[11px] text-text-secondary">
        <input
          type="checkbox"
          className="h-3 w-3 rounded border-border text-accent accent-accent"
        />
        Show tags for unsolved problems
      </label>
      <label className="flex items-center gap-2 text-[11px] text-text-secondary">
        <input
          type="checkbox"
          defaultChecked
          className="h-3 w-3 rounded border-border text-accent accent-accent"
        />
        Hide solved problems
      </label>
    </div>
  );
}
