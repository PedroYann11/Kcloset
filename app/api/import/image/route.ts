import { BROWSER_UA, parsePublicUrl } from "@/lib/link-import";

/**
 * Serve a foto da loja pela nossa própria origem.
 *
 * Sem isso o navegador não consegue usar a imagem: buscar direto do CDN da
 * loja esbarra em CORS, e desenhar num canvas de outra origem contamina o
 * canvas, o que faz `toDataURL` (o compressor em lib/image.ts) lançar erro.
 * Passando por aqui a imagem vira mesma origem e o pipeline de foto que já
 * existe funciona sem mudança.
 */

const TIMEOUT_MS = 12_000;

/** Teto de download. Foto de produto não passa disso. */
const MAX_BYTES = 12_000_000;

export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get("url") ?? "";
  const url = parsePublicUrl(target);
  if (!url) return new Response("URL inválida", { status: 400 });

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, Accept: "image/*,*/*;q=0.8" },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return new Response("Não foi possível buscar a imagem", { status: 502 });
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.startsWith("image/")) {
    return new Response("O link não é uma imagem", { status: 422 });
  }

  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) return new Response("Imagem grande demais", { status: 413 });

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES) return new Response("Imagem grande demais", { status: 413 });

  return new Response(bytes, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
