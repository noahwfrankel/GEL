import { NextRequest, NextResponse } from "next/server";
import { SPOTIFY_REDIRECT_URI } from "@/lib/spotify-auth";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, code_verifier } = body as {
      code?: string;
      code_verifier?: string;
    };

    if (!code || !code_verifier) {
      return NextResponse.json(
        { error: "Missing code or code_verifier" },
        { status: 400 }
      );
    }

    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: "Server misconfiguration: missing client ID" },
        { status: 500 }
      );
    }

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
      client_id: clientId,
      code_verifier,
    });

    const res = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error_description ?? data.error ?? "Token exchange failed" },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: "Token exchange failed" },
      { status: 500 }
    );
  }
}
