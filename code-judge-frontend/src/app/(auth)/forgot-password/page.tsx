import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <div className="border border-[#E6E7EB] bg-white p-6">
        <h1 className="mb-4 text-lg font-bold text-[#111827] text-center">Reset Password</h1>
        <form className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-[#6B7280] mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded border border-[#E6E7EB] bg-white px-3 py-1.5 text-[11px] text-[#111827] placeholder-[#9CA3AF] outline-none focus:border-[#2563EB]/40"
              placeholder="your@email.com"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded border border-[#2563EB] bg-[#2563EB] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#1D4ED8] transition-colors"
          >
            Send Reset Link
          </button>
        </form>
        <div className="mt-3 text-center text-[10px] text-[#6B7280]">
          <Link href="/login" className="text-[#2563EB] hover:underline">Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}