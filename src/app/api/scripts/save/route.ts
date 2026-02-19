import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { scripts } = body as {
      scripts?: Array<{
        script_text: string;
        category?: string;
        model_id?: string;
        source_script_id?: string;
        is_ai_generated?: boolean;
        metadata?: Record<string, unknown>;
      }>;
    };

    if (!scripts || !Array.isArray(scripts) || scripts.length === 0) {
      return NextResponse.json(
        { error: "scripts array is required" },
        { status: 400 }
      );
    }

    // Insert all scripts
    const scriptsToInsert = scripts.map((script) => ({
      user_id: user.id,
      script_text: script.script_text,
      category: script.category || "general",
      model_id: script.model_id || null,
      source_script_id: script.source_script_id || null,
      is_ai_generated: script.is_ai_generated || false,
      metadata: script.metadata || {},
    }));

    const { data, error } = await supabase
      .from("scripts")
      .insert(scriptsToInsert)
      .select();

    if (error) {
      console.error("Save scripts error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ scripts: data });
  } catch (error) {
    console.error("Save scripts error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save scripts" },
      { status: 500 }
    );
  }
}
