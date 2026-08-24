/**
 * Leitura de link de loja.
 *
 * A usuária cola o link do produto e o servidor tenta descobrir as fotos e o
 * nome da peça. Duas coisas importantes que vieram de teste real, não de
 * suposição:
 *
 * 1. Boa parte das lojas publica tudo em `og:` e em JSON-LD (`schema.org`),
 *    então dá para ler sem navegador e sem serviço pago.
 * 2. Algumas lojas (a Shein entre elas) servem só a casca do app com
 *    anti-robô, e nenhum truque de user-agent resolve. Para essas, o caminho
 *    que funciona é a usuária colar a URL da própria imagem: o CDN de imagem
 *    entrega normalmente.
 *
 * Por isso o mesmo endpoint aceita link de página e link de imagem.
 */

export type ImportKind = "image" | "page";

export type ImportResult = {
  kind: ImportKind;
  /** Fotos candidatas, da mais provável para a menos. */
  images: string[];
  title?: string;
  price?: string;
};

export type ImportFailure = {
  /** `blocked` quer dizer loja que não entrega metadados, como a Shein. */
  reason: "invalid-url" | "unreachable" | "blocked";
};

/** Navegador comum. Sem isso várias lojas devolvem uma página degradada. */
export const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";

/**
 * Aceita apenas http(s) para host público.
 *
 * Um endpoint que busca URL arbitrária a pedido do cliente é um vetor de
 * SSRF: sem essa checagem dá para usar o servidor para varrer a rede interna
 * de quem hospeda. Por isso endereço privado, loopback e link-local ficam de
 * fora.
 */
export function parsePublicUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || !host.includes(".")) return null;
  if (host === "[::1]" || host === "::1") return null;
  if (/^127\./.test(host)) return null;
  if (/^10\./.test(host)) return null;
  if (/^192\.168\./.test(host)) return null;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return null;
  if (/^169\.254\./.test(host)) return null;
  if (/^0\./.test(host)) return null;

  return url;
}

/** Extensões que denunciam uma URL de imagem quando o servidor não diz o tipo. */
const IMAGE_EXTENSION = /\.(jpe?g|png|webp|avif|gif)(\?|$)/i;

export function looksLikeImageUrl(url: URL): boolean {
  return IMAGE_EXTENSION.test(url.pathname + url.search);
}

/* -------------------------------------------------------------------------
   Extração de metadados
   ------------------------------------------------------------------------- */

const META_CONTENT = /<meta[^>]+content=["']([^"']+)["'][^>]*>/i;

/** Lê `<meta property="og:image" content="...">` em qualquer ordem de atributo. */
function metaContent(html: string, key: string): string[] {
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]*>|<meta[^>]+content=["'][^"']*["'][^>]*(?:property|name)=["']${key}["'][^>]*>`,
    "gi",
  );

  const found: string[] = [];
  for (const tag of html.match(pattern) ?? []) {
    const value = tag.match(META_CONTENT)?.[1];
    if (value) found.push(decodeEntities(value));
  }
  return found;
}

/** Percorre os blocos JSON-LD atrás de um `Product`. */
function fromJsonLd(html: string): { images: string[]; title?: string; price?: string } {
  const blocks = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  if (!blocks) return { images: [] };

  const images: string[] = [];
  let title: string | undefined;
  let price: string | undefined;

  for (const block of blocks) {
    const json = block.replace(/^[\s\S]*?>/, "").replace(/<\/script>$/i, "");

    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      continue;
    }

    // JSON-LD pode vir como objeto, lista, ou embrulhado em @graph.
    const candidates = Array.isArray(parsed)
      ? parsed
      : [parsed, ...(asRecord(parsed)?.["@graph"] as unknown[] ?? [])];

    for (const candidate of candidates) {
      const node = asRecord(candidate);
      if (!node) continue;

      const type = node["@type"];
      const isProduct = Array.isArray(type)
        ? type.includes("Product")
        : type === "Product";
      if (!isProduct) continue;

      if (typeof node.name === "string") title ??= node.name;

      const image = node.image;
      if (typeof image === "string") images.push(image);
      else if (Array.isArray(image)) {
        image.forEach((entry) => {
          if (typeof entry === "string") images.push(entry);
          else {
            const url = asRecord(entry)?.url;
            if (typeof url === "string") images.push(url);
          }
        });
      }

      const offers = asRecord(Array.isArray(node.offers) ? node.offers[0] : node.offers);
      const rawPrice = offers?.price ?? offers?.lowPrice;
      if (typeof rawPrice === "string" || typeof rawPrice === "number") {
        price ??= String(rawPrice);
      }
    }
  }

  return { images, title, price };
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Título da aba, usado só quando não há nome melhor. */
function pageTitle(html: string): string | undefined {
  const raw = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  return raw ? decodeEntities(raw).trim() : undefined;
}

/**
 * Junta tudo que a página oferece. A ordem das fotos importa: JSON-LD costuma
 * trazer a galeria do produto, e `og:image` a foto principal.
 */
export function extractFromHtml(html: string, base: URL): ImportResult | ImportFailure {
  const jsonLd = fromJsonLd(html);
  const og = [...metaContent(html, "og:image"), ...metaContent(html, "og:image:secure_url")];
  const twitter = metaContent(html, "twitter:image");

  const images = unique(
    [...og, ...jsonLd.images, ...twitter]
      .map((src) => absolute(src, base))
      .filter((src): src is string => Boolean(src)),
  );

  // Nem foto nem nome quer dizer casca de app com anti-robô.
  if (images.length === 0) return { reason: "blocked" };

  const ogTitle = metaContent(html, "og:title")[0];

  return {
    kind: "page",
    images: images.slice(0, 10),
    title: jsonLd.title ?? ogTitle ?? pageTitle(html),
    price: jsonLd.price,
  };
}

function absolute(src: string, base: URL): string | null {
  try {
    const resolved = new URL(src, base);
    return resolved.protocol === "http:" || resolved.protocol === "https:"
      ? resolved.toString()
      : null;
  } catch {
    return null;
  }
}

const unique = (list: string[]) => [...new Set(list)];
