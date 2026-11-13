export function CreditCoin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 30" aria-hidden="true" className={className}>
      <circle cx="15" cy="15" r="13.5" fill="#f6bf2f" stroke="#b87408" strokeWidth="1.5" />
      <path
        d="M15 7.5l2 4.7 5 .5-3.8 3.3 1.2 5-4.4-2.7-4.4 2.7 1.2-5L8 12.7l5-.5z"
        fill="#fff4c9"
        stroke="#c98410"
        strokeWidth=".8"
      />
    </svg>
  );
}
