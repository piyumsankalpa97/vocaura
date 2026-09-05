import Link from "next/link";

interface VocauraLogoProps {
  className?: string;
  showTagline?: boolean;
}

export function VocauraLogo({
  className = "",
  showTagline = false,
}: VocauraLogoProps) {
  return (
    <Link
      href="/"
      className={`group flex items-center gap-2.5 transition-opacity hover:opacity-90 ${className}`}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="translate-y-[0.5px]"
        >
          {/* Subtle audio / flow wave stylized into a V */}
          <path d="M4 6 L12 20 L20 6" />
          <path d="M9 10 L12 15 L15 10" strokeWidth="1.8" opacity="0.8" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="font-semibold tracking-tight text-foreground text-lg leading-none">
          Vocaura
        </span>
        {showTagline && (
          <span className="text-[11px] text-muted-foreground font-medium mt-0.5 leading-none">
            Professional English Trainer
          </span>
        )}
      </div>
    </Link>
  );
}
