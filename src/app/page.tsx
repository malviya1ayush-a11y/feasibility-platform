import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">
        Feasibility Platform
      </h1>
      <p className="max-w-md text-center text-sm text-neutral-500">
        Development feasibility intelligence for builders and PMCs in
        Maharashtra.
      </p>
      <div className="mt-2 flex gap-3">
        <Link
          href="/properties/new"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          New property
        </Link>
        <Link
          href="/properties"
          className="rounded-lg border px-4 py-2 text-sm font-medium"
        >
          All properties
        </Link>
      </div>
      <span className="mt-4 rounded-full border px-3 py-1 text-xs text-neutral-400">
        ruleset mh-udcpr-0.1 · draft · requires professional verification
      </span>
    </main>
  );
}
