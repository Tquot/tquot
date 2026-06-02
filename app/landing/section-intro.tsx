export function SectionIntro({
  eyebrow,
  title,
  subtitle,
  centered,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="text-sm font-semibold uppercase tracking-widest text-tquot-teal">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-[family-name:var(--font-outfit)] text-3xl font-bold tracking-tight text-tquot-navy sm:text-4xl">
        {title}
      </h2>
      {subtitle ? <p className="mt-4 text-tquot-muted">{subtitle}</p> : null}
    </div>
  );
}
