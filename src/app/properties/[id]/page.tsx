import Link from "next/link";
import { connection } from "next/server";
import { supabase } from "@/lib/supabase";
import { INPUT_KEYS } from "@/lib/constants";


const statusStyles: Record<string, string> = {
  verified: "bg-green-100 text-green-800",
  extracted: "bg-blue-100 text-blue-800",
  assumed: "bg-amber-100 text-amber-800",
  estimated: "bg-amber-100 text-amber-800",
  requires_professional_verification: "bg-red-100 text-red-800",
};

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;

  const [{ data: property }, { data: inputs }] = await Promise.all([
    supabase.from("properties").select("*").eq("id", id).single(),
    supabase.from("property_inputs").select("*").eq("property_id", id),
  ]);

  if (!property) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <p className="text-sm text-neutral-500">Property not found.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link href="/properties" className="text-sm text-neutral-500 hover:underline">
        ← All properties
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{property.name}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {[property.address, property.ward_zone].filter(Boolean).join(" · ") || "No address yet"}
        {" · "}
        {property.jurisdiction === "mh-udcpr" ? "Maharashtra UDCPR" : "Mumbai DCPR 2034"}
      </p>

      <div className="mt-8 rounded-xl border">
        <div className="border-b px-4 py-3 text-sm font-semibold">Inputs on record</div>
        <ul className="divide-y">
          {(inputs ?? []).map((i) => (
            <li key={i.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-medium">
                  {INPUT_KEYS[i.key as keyof typeof INPUT_KEYS] ?? i.key}
                </div>
                <div className="text-sm text-neutral-600">{String(i.value)}</div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs ${statusStyles[i.status] ?? "bg-neutral-100"}`}
              >
                {i.status.replaceAll("_", " ")}
              </span>
            </li>
          ))}
          {(inputs ?? []).length === 0 && (
            <li className="px-4 py-3 text-sm text-neutral-500">No inputs recorded.</li>
          )}
        </ul>
      </div>

      <p className="mt-6 text-sm text-neutral-400">
        Feasibility computation arrives on Day 4 — this property is ready for it.
      </p>
    </main>
  );
}
