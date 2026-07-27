import Link from "next/link";

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 border-b border-[#E6E7EB] pb-2">
        <h1 className="text-xl font-bold text-[#111827]">Profile</h1>
      </div>
      <div className="border border-[#E6E7EB] bg-white p-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#E6E7EB] bg-[#FAFAFB] text-sm font-bold text-[#6B7280]">
            U
          </div>
          <div>
            <div className="text-sm font-bold text-[#111827]">User</div>
            <div className="text-[10px] text-[#6B7280]">user@example.com</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="border border-[#E6E7EB] bg-white p-4 text-center">
          <div className="text-lg font-bold text-[#2563EB]">0</div>
          <div className="text-[10px] text-[#6B7280] uppercase">Solved</div>
        </div>
        <div className="border border-[#E6E7EB] bg-white p-4 text-center">
          <div className="text-lg font-bold text-[#2563EB]">0</div>
          <div className="text-[10px] text-[#6B7280] uppercase">Rank</div>
        </div>
        <div className="border border-[#E6E7EB] bg-white p-4 text-center">
          <div className="text-lg font-bold text-[#2563EB]">0</div>
          <div className="text-[10px] text-[#6B7280] uppercase">Contributions</div>
        </div>
      </div>
      <Link href="/settings" className="text-[11px] text-[#2563EB] hover:underline">Edit Profile →</Link>
    </div>
  );
}