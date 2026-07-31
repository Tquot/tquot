import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserAndAgency } from "@/lib/auth/agency-context";
import { hotelbedsSignature } from "@/lib/providers/hotelbeds/signature";
import { upsertConnection, updateConnectionStatus } from "@/lib/connectors/storage";

const BodySchema = z.object({
  provider: z.enum(["hotelbeds", "duffel", "booking"]),
  credentials: z.record(z.string(), z.string()),
  save: z.boolean().optional().default(true),
});

async function testHotelbeds(c: Record<string, string>) {
  if (!c.apiKey && !c.api_key) {
    return NextResponse.json(
      { ok: false, message: "Faltan API Key o Secret." },
      { status: 400 },
    );
  }
  const apiKey = c.apiKey ?? c.api_key;
  const secret = c.secret ?? c.apiSecret ?? "";
  if (!secret) {
    return NextResponse.json(
      { ok: false, message: "Faltan API Key o Secret." },
      { status: 400 },
    );
  }

  const { signature } = hotelbedsSignature(apiKey, secret);

  const res = await fetch(
    "https://api.test.hotelbeds.com/hotel-content-api/1.0/locations/countries?fields=code&from=1&to=1",
    {
      headers: {
        "Api-key": apiKey,
        "X-Signature": signature,
        Accept: "application/json",
        "Accept-Encoding": "gzip",
      },
      signal: AbortSignal.timeout(8000),
    },
  );

  if (res.ok) {
    return NextResponse.json({
      ok: true,
      message:
        "Content API verificada. Hoteles, fotos y regímenes disponibles.",
    });
  }
  if (res.status === 401 || res.status === 403) {
    return NextResponse.json({
      ok: false,
      message:
        "API Key o Secret incorrectos. Revísalos en APItude → My Apps.",
    });
  }
  if (res.status === 429) {
    return NextResponse.json({
      ok: false,
      message:
        "Hotelbeds ha limitado la petición. Espera un minuto y reintenta.",
    });
  }
  return NextResponse.json({
    ok: false,
    message: `Hotelbeds devolvió ${res.status}.`,
  });
}

async function testDuffel(c: Record<string, string>) {
  const token = c.accessToken ?? c.api_key ?? c.token;
  if (!token) {
    return NextResponse.json(
      { ok: false, message: "Falta el access token de Duffel." },
      { status: 400 },
    );
  }
  const res = await fetch("https://api.duffel.com/air/airports?limit=1", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Duffel-Version": "v2",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (res.ok) {
    return NextResponse.json({
      ok: true,
      message: "Duffel verificado. Tabla de vuelos con horarios disponible.",
    });
  }
  if (res.status === 401 || res.status === 403) {
    return NextResponse.json({
      ok: false,
      message: "Token de Duffel incorrecto.",
    });
  }
  return NextResponse.json({
    ok: false,
    message: `Duffel devolvió ${res.status}.`,
  });
}

async function testBooking(c: Record<string, string>) {
  const key = c.apiKey ?? c.api_key;
  if (!key) {
    return NextResponse.json(
      { ok: false, message: "Falta la API key de Booking RapidAPI." },
      { status: 400 },
    );
  }
  // Lightweight presence check — full search happens at quote time
  if (key.length < 8) {
    return NextResponse.json({
      ok: false,
      message: "API key demasiado corta.",
    });
  }
  return NextResponse.json({
    ok: true,
    message: "Credencial guardada. Segunda línea del comparador lista.",
  });
}

export async function POST(req: Request) {
  const auth = await getAuthenticatedUserAndAgency();
  if ("response" in auth) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { provider, credentials, save } = parsed.data;

  let result: NextResponse;
  if (provider === "hotelbeds") result = await testHotelbeds(credentials);
  else if (provider === "duffel") result = await testDuffel(credentials);
  else result = await testBooking(credentials);

  const payload = (await result.clone().json()) as {
    ok?: boolean;
    message?: string;
  };

  if (save && payload.ok) {
    try {
      let creds: Record<string, string>;
      if (provider === "hotelbeds") {
        creds = {
          api_key: credentials.apiKey ?? credentials.api_key ?? "",
          secret: credentials.secret ?? credentials.apiSecret ?? "",
          environment: "test",
        };
      } else if (provider === "duffel") {
        creds = {
          access_token:
            credentials.accessToken ??
            credentials.api_key ??
            credentials.token ??
            "",
        };
      } else {
        creds = {
          api_key: credentials.apiKey ?? credentials.api_key ?? "",
        };
      }

      const { id } = await upsertConnection({
        agencyId: auth.agencyId,
        providerId: provider,
        credentials: creds,
        createdBy: auth.userId,
        displayName: provider,
      });
      await updateConnectionStatus(id, "active", null);
    } catch (err) {
      console.error("[onboarding/test-provider] save failed", err);
      return NextResponse.json({
        ok: false,
        message:
          "Credenciales válidas pero no se pudieron guardar. Revisa CREDENTIALS_KEY.",
      });
    }
  }

  return result;
}
