export default function PayAttentionWidget() {
  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <span className="text-[13px] font-bold text-[#2563EB]">Pay attention</span>
      <div className="text-center">
        <p className="text-[11px] font-semibold text-[#111827]">
          Codeforces Round 1742 (Div. 2)
        </p>
        <p className="text-[10px] text-[#6B7280]">Mar 15, 2025 • 2h 30m</p>
      </div>
      {/* Countdown timer display */}
      <div className="flex items-center gap-2 text-[11px] font-mono text-[#6B7280]">
        <span>02</span>
        <span>:</span>
        <span>14</span>
        <span>:</span>
        <span>37</span>
      </div>
    </div>
  );
}