export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 border-b border-[#E6E7EB] pb-2">
        <h1 className="text-xl font-bold text-[#111827]">Settings</h1>
      </div>
      <div className="space-y-3">
        <div className="border border-[#E6E7EB] bg-white">
          <div className="border-b border-[#E6E7EB] bg-[#FAFAFB] px-3 py-1.5">
            <span className="text-[11px] font-medium text-[#2563EB]">→ General</span>
          </div>
          <div className="p-3 space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-[#6B7280] mb-1">Handle</label>
              <input
                type="text"
                className="w-full max-w-xs rounded border border-[#E6E7EB] bg-white px-3 py-1.5 text-[11px] text-[#111827] outline-none focus:border-[#2563EB]/40"
                defaultValue="user"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#6B7280] mb-1">Email</label>
              <input
                type="email"
                className="w-full max-w-xs rounded border border-[#E6E7EB] bg-white px-3 py-1.5 text-[11px] text-[#111827] outline-none focus:border-[#2563EB]/40"
                defaultValue="user@example.com"
              />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-[11px] text-[#6B7280]">
                <input type="checkbox" className="h-3 w-3 accent-[#2563EB]" defaultChecked />
                Show tags for unsolved problems
              </label>
              <label className="flex items-center gap-2 text-[11px] text-[#6B7280]">
                <input type="checkbox" className="h-3 w-3 accent-[#2563EB]" />
                Receive email notifications
              </label>
            </div>
            <button className="rounded border border-[#2563EB] bg-[#2563EB] px-4 py-1 text-[10px] font-medium text-white hover:bg-[#1D4ED8] transition-colors">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}