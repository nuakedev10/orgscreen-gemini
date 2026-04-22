/**
 * OrgScreen brand mark.
 * An abstract Sankofa-inspired curl + diamond — a small nod to Adinkra symbolism
 * ("learn from the past to build the future"), which fits a screening tool that
 * ingests an organization's hiring history.
 */
export default function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4 12c0-4.4 3.6-8 8-8 2.8 0 5.2 1.5 6.6 3.6"
        stroke="#E0531B"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M20 12c0 4.4-3.6 8-8 8-2.8 0-5.2-1.5-6.6-3.6"
        stroke="#FBF8F1"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <rect
        x="10"
        y="10"
        width="4"
        height="4"
        transform="rotate(45 12 12)"
        fill="#D8A52A"
      />
    </svg>
  );
}
