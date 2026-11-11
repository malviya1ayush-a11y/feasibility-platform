"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DATA_STATUSES } from "@/lib/constants";

type Status = (typeof DATA_STATUSES)[number];

interface NumField {
  key: string;
  label: string;
  value: string;
  status: Status;
}

const initialFields: NumField[] = [
  { key: "plot_area_sqm", label: "Plot area (sq m)", value: "", status: "verified" },
  { key: "road_width_m", label: "Front road width (m)", value: "", status: "assumed" },
  { key: "existing_bua_sqm", label: "Existing built-up area (sq m) — leave blank for open land", value: "", status: "estimated" },
  { key: "num_existing_members", label: "Existing members / tenements", value: "", status: "estimated" },
];

const statusLabel: Record<Status, string> = {
  verified: "Verified (document in hand)",
  extracted: "Extracted (from a document)",
  assumed: "Assumed",
  estimated: "Estimated",
  requires_professional_verification: "Needs professional verification",
};

export default function NewPropertyPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [wardZone, setWardZone] = useState("");
  const [jurisdiction, setJurisdiction] = useState("mh-udcpr");
  const [fields, setFields] = useState(initialFields);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (i: number, patch: Partial<NumField>) =>
    setFields((f) => f.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function save() {
    setSaving(true);
    setError(null);
    const inputs = [
      ...fields
        .filter((f) => f.value !== "")
        .map((f) => ({ key: f.key, value: Number(f.value), status: f.status })),
      { key: "zone_type", value: "residential", status: "assumed" },
    ];
    const res = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, address, ward_zone: wardZone, jurisdiction, inputs }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setSaving(false);
      return;
    }
    router.push(`/properties/${data.property.id}`);
  }

  const canSave =
    name.trim() !== "" &&
    fields[0].value !== "" &&
    fields[1].value !== "" &&
    !saving;

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold tracking-tight">New property</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Every number you enter carries a confidence tag — the feasibility report
        will be only as strong as its weakest input, and it will say so.
      </p>

      <div className="mt-8 space-y-5">
        <label className="block">
          <span className="text-sm font-medium">Property name *</span>
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="e.g. Shree Ganesh CHS, Mulund West"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Address</span>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Ward / zone</span>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={wardZone}
              onChange={(e) => setWardZone(e.target.value)}
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium">Rulebook (jurisdiction)</span>
          <select
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
          >
            <option value="mh-udcpr">Maharashtra — UDCPR</option>
            <option value="mum-dcpr2034">Mumbai — DCPR 2034</option>
          </select>
        </label>

        <div className="rounded-xl border p-4">
          <h2 className="text-sm font-semibold">Plot inputs</h2>
          <div className="mt-3 space-y-4">
            {fields.map((f, i) => (
              <div key={f.key} className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm">{f.label}{i < 2 ? " *" : ""}</span>
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    value={f.value}
                    onChange={(e) => setField(i, { value: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-neutral-500">How sure are you?</span>
                  <select
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    value={f.status}
                    onChange={(e) => setField(i, { status: e.target.value as Status })}
                  >
                    {DATA_STATUSES.map((s) => (
                      <option key={s} value={s}>{statusLabel[s]}</option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={save}
          disabled={!canSave}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save property"}
        </button>
      </div>
    </main>
  );
}
