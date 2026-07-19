export default function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.7}
      viewBox="0 0 100 70"
      fill="none"
      aria-hidden="true"
    >
      <g
        stroke="#f5f0e6"
        strokeWidth="11"
        strokeLinecap="round"
      >
        <path d="M 10 58 L 30 36" />
        <path d="M 38 34 L 52 52" />
        <path d="M 60 54 L 80 32" />
      </g>
      <circle cx="88" cy="14" r="10" fill="#f97316" />
    </svg>
  );
}
