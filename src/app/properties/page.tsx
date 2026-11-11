import Link from "next/link";
import { connection } from "next/server";
import { supabase } from "@/lib/supabase";


export default async function PropertiesPage() {
  await connection();
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, address, ward_zone, jurisdiction, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
        <Link
          href="/properties/new"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          + New property
        </Link>
      </div>

      <ul className="mt-6 divide-y rounded-xl border">
        {(properties ?? []).map((p) => (
          <li key={p.id}>
            <Link href={`/properties/${p.id}`} className="block px-4 py-3 hover:bg-neutral-50">
              <div className="text-sm font-medium">{p.name}</div>
              <div className="text-sm text-neutral-500">
                {[p.address, p.ward_zone].filter(Boolean).join(" · ") || "No address yet"}
              </div>
            </Link>
          </li>
        ))}
        {(properties ?? []).length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-neutral-500">
            No properties yet — create the first one.
          </li>
        )}
      </ul>
    </main>
  );
}
