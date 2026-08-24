import { NextResponse } from "next/server";
import {
  BROWSER_UA,
  extractFromHtml,
  looksLikeImageUrl,
  parsePublicUrl,
  type ImportResult,
} from "@/lib/link-import";

/** Páginas de loja são grandes. 12s cobre as lentas sem pendurar a rota. */
const TIMEOUT_MS = 12_000;

/** Teto de leitura do HTML, para uma página gigante não estourar a memória. */
const MAX_HTML_BYTES = 3_000_000;

export async function POST(request: Request) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ reason: "invalid-url" }, { status: 400 });
  }

  const url = parsePublicUrl(body.url ?? "");
  if (!url) return NextResponse.json({ reason: "invalid-url" }, { status: 400 });

  // Link direto de imagem já resolve sozinho, sem precisar ler página nenhuma.
  if (looksLikeImageUrl(url)) {
    const result: ImportResult = { kind: "image", images: [url.toString()] };
    return NextResponse.json(result);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,image/*;q=0.8,*/*;q=0.5",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return NextResponse.json({ reason: "unreachable" }, { status: 502 });
  }

  if (!response.ok) {
    return NextResponse.json({ reason: "unreachable" }, { status: 502 });
  }

  const contentType = response.headers.get("content-type") ?? "";

  // A URL não parecia imagem mas o servidor devolveu uma. Vale como foto.
  if (contentType.startsWith("image/")) {
    const result: ImportResult = { kind: "image", images: [response.url || url.toString()] };
    return NextResponse.json(result);
  }

  if (!contentType.includes("html")) {
    return NextResponse.json({ reason: "blocked" }, { status: 422 });
  }

  const html = (await response.text()).slice(0, MAX_HTML_BYTES);
  const extracted = extractFromHtml(html, new URL(response.url || url.toString()));

  if ("reason" in extracted) {
    return NextResponse.json(extracted, { status: 422 });
  }

  return NextResponse.json(extracted);
}
