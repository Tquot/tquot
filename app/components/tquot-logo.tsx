import Link from "next/link";

type TQuotLogoProps = {
  variant?: "light" | "dark";
  href?: string;
  className?: string;
};

export function TQuotLogo({
  variant = "light",
  href = "/",
  className = "",
}: TQuotLogoProps) {
  const wordmarkClass =
    variant === "dark" ? "text-white" : "text-tquot-text";

  const content = (
    <>
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-tquot-teal font-[family-name:var(--font-outfit)] text-xl font-extrabold leading-none text-white shadow-sm"
        aria-hidden
      >
        Q
      </span>
      <span
        className={`font-[family-name:var(--font-outfit)] text-xl font-bold leading-none tracking-tight ${wordmarkClass}`}
      >
        T<span className="text-tquot-teal">Quot</span>
      </span>
    </>
  );

  if (!href) {
    return (
      <div className={`inline-flex items-center gap-3 ${className}`}>{content}</div>
    );
  }

  return (
    <Link
      href={href}
      aria-label="TQuot"
      className={`inline-flex items-center gap-3 transition-opacity hover:opacity-90 ${className}`}
    >
      {content}
    </Link>
  );
}
