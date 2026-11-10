export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">
        Feasibility Platform
      </h1>
      <p className="max-w-md text-center text-sm text-neutral-500">
        Development feasibility intelligence for builders and PMCs in
        Maharashtra. Day 1 skeleton — rules engine lands on Day 2.
      </p>
      <span className="rounded-full border px-3 py-1 text-xs text-neutral-400">
        ruleset mh-udcpr-0.1 · draft · requires professional verification
      </span>
    </main>
  );
}
