export default function PayAttentionWidget() {
  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <span className="text-[13px] font-bold text-accent">Pay attention</span>
      <div className="text-center">
        <p className="text-[11px] font-semibold text-text-primary">
          Codeforces Round 1742 (Div. 2)
        </p>
        <p className="text-[10px] text-text-secondary">Mar 15, 2025 • 2h 30m</p>
      </div>
      {/* Countdown timer display */}
      <div className="flex items-center gap-2 text-[11px] font-mono text-text-secondary">
        <span>02</span>
        <span>:</span>
        <span>14</span>
        <span>:</span>
        <span>37</span>
      </div>
    </div>
  );
}