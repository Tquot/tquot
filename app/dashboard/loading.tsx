export default function Loading() {
  return (
    <main className="mx-auto max-w-[1080px] px-6 py-10 sm:py-12">
      <div className="space-y-12">
        <section className="space-y-6">
          <div className="skeleton h-3 w-48" />
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[auto_1fr]">
            <div className="skeleton h-24 w-48" />
            <div className="space-y-5">
              <div className="skeleton h-8 w-full" />
              <div className="skeleton h-8 w-full" />
              <div className="skeleton h-8 w-full" />
              <div className="skeleton h-8 w-full" />
            </div>
          </div>
          <div className="skeleton h-12 w-full" />
        </section>

        <div className="h-px bg-border-1" />

        <section className="space-y-4">
          <div className="skeleton h-3 w-48" />
          <div className="flex gap-3 overflow-hidden">
            <div className="skeleton h-[200px] w-[220px] shrink-0" />
            <div className="skeleton h-[200px] w-[220px] shrink-0" />
            <div className="skeleton h-[200px] w-[220px] shrink-0" />
            <div className="skeleton h-[200px] w-[220px] shrink-0" />
          </div>
        </section>

        <div className="h-px bg-border-1" />

        <section className="space-y-4">
          <div className="skeleton h-3 w-32" />
          <div className="space-y-2">
            <div className="skeleton h-14 w-full" />
            <div className="skeleton h-14 w-full" />
            <div className="skeleton h-14 w-full" />
            <div className="skeleton h-14 w-full" />
          </div>
        </section>
      </div>
    </main>
  );
}
