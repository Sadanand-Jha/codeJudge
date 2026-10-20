import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

export async function GET() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  try {
    const upstream = await fetch(OPENROUTER_MODELS_URL, {
      headers: {
        Accept: "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      const authRequired = upstream.status === 401 || upstream.status === 403;

      return NextResponse.json(
        {
          error: authRequired
            ? "OpenRouter rejected the request. Add OPENROUTER_API_KEY to the server environment and retry."
            : `OpenRouter returned HTTP ${upstream.status}. Try again shortly.`,
        },
        { status: upstream.status },
      );
    }

    const payload = await upstream.json();

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "The OpenRouter API could not be reached from the server. Check connectivity and retry." },
      { status: 502 },
    );
  }
}
