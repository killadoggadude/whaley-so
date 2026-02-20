import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Gallery item ID required" }, { status: 400 });
    }

    const { error } = await supabase.rpc("increment_gallery_remakes", { item_id: id });

    if (error) {
      const { error: updateError } = await supabase
        .from("gallery")
        .update({ remakes: 1 })
        .eq("id", id);

      if (updateError) {
        console.error("Gallery remake increment error:", updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gallery remake error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to increment remakes" },
      { status: 500 }
    );
  }
}
