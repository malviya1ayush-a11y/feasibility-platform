import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { DEV_ORG_ID } from "@/lib/constants";

interface InputRow {
  key: string;
  value: unknown;
  status: string;
  source_note?: string;
}

/** Create a property with its tagged inputs. */
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body?.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { data: property, error } = await supabase
    .from("properties")
    .insert({
      org_id: DEV_ORG_ID,
      name: body.name,
      address: body.address ?? null,
      ward_zone: body.ward_zone ?? null,
      jurisdiction: body.jurisdiction ?? "mh-udcpr",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const inputs: InputRow[] = Array.isArray(body.inputs) ? body.inputs : [];
  if (inputs.length > 0) {
    const rows = inputs
      .filter((i) => i.key && i.value !== "" && i.value != null)
      .map((i) => ({
        property_id: property.id,
        org_id: DEV_ORG_ID,
        key: i.key,
        value: i.value,
        status: i.status ?? "assumed",
        source_note: i.source_note ?? null,
      }));
    const { error: inputError } = await supabase
      .from("property_inputs")
      .insert(rows);
    if (inputError) {
      return NextResponse.json(
        { error: `property saved but inputs failed: ${inputError.message}` },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ property }, { status: 201 });
}

/** List properties (dev org). */
export async function GET() {
  const { data, error } = await supabase
    .from("properties")
    .select("id, name, address, ward_zone, jurisdiction, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ properties: data });
}
