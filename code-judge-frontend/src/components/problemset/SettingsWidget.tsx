export default function SettingsWidget() {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-[11px] text-[#6B7280]">
        <input
          type="checkbox"
          className="h-3 w-3 rounded border-[#E6E7EB] text-[#2563EB] accent-[#2563EB]"
        />
        Show tags for unsolved problems
      </label>
      <label className="flex items-center gap-2 text-[11px] text-[#6B7280]">
        <input
          type="checkbox"
          defaultChecked
          className="h-3 w-3 rounded border-[#E6E7EB] text-[#2563EB] accent-[#2563EB]"
        />
        Hide solved problems
      </label>
    </div>
  );
}