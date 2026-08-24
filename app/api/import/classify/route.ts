import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { SHAPE_OPTIONS } from "@/components/icons/garments";
import { CATEGORIES, COLOR_SUGGESTIONS, FORMALITIES, SEASONS } from "@/data/seed-items";
import type { CategoryId, GarmentShape } from "@/types";

/**
 * Classifica em lote as peças já recortadas no cadastro em lote: uma foto de
 * entrada, uma classificação de saída, na mesma ordem. Diferente de
 * `enrich`, que escolhe a melhor foto entre várias DA MESMA peça, aqui cada
 * foto já é uma peça diferente, então não existe "melhor foto" pra escolher.
 *
 * A entrada é base64 do próprio recorte feito no aparelho da usuária, não
 * uma URL remota: o servidor nunca busca nada sozinho aqui, só recebe bytes
 * que o navegador já decodificou. Não existe risco de SSRF como na rota de
 * importar por link, `parsePublicUrl` continua sendo só dela.
 *
 * Sem `ANTHROPIC_API_KEY` a rota responde 501 e a grade de revisão segue
 * funcionando: a usuária preenche cada peça na mão, como sempre pôde.
 */

/** Classificar uma peça já recortada é tarefa simples, não precisa de esforço alto. */
const EFFORT = "low" as const;

/** Mesmo teto que a porta "Várias fotos" já aplica na entrada de arquivo. */
const MAX_IMAGES = 10;

type ImageInput = { mediaType: "image/png" | "image/jpeg"; data: string };

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ reason: "no-api-key" }, { status: 501 });
  }

  let body: { images?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ reason: "invalid-body" }, { status: 400 });
  }

  const images = (body.images ?? [])
    .map(parseDataUrl)
    .filter((image): image is ImageInput => image !== null)
    .slice(0, MAX_IMAGES);

  if (images.length === 0) {
    return NextResponse.json({ reason: "invalid-body" }, { status: 400 });
  }

  const client = new Anthropic();

  const shapesByCategory = CATEGORIES.map(
    (category) =>
      `- ${category.id} (${category.long}): ${SHAPE_OPTIONS[category.id]
        .map((shape) => shape.value)
        .join(", ")}`,
  ).join("\n");

  const system = `Você cataloga roupas para um guarda-roupa virtual.

Recebe várias fotos, cada uma já recortada, mostrando UMA peça de roupa por foto. Responde SOMENTE com um array JSON, na mesma ordem das fotos, um objeto por foto, sem texto em volta e sem cercas de código.

Campos de cada objeto:
- "name": nome curto em português, no máximo 5 palavras, como "Blusa de manga curta rosa".
- "category" e "shape", combinando com a lista:
${shapesByCategory}
- "fullBody": true apenas para vestido ou macacão.
- "color": um de ${COLOR_SUGGESTIONS.join(", ")}.
- "season": um de ${SEASONS.join(", ")}.
- "formality": um de ${FORMALITIES.join(", ")}.

Quando estiver em dúvida em algum campo, escolha o valor mais neutro da lista.`;

  const prompt = `São ${images.length} foto(s), cada uma uma peça diferente, na ordem em que devem ser respondidas.`;

  let raw: string;
  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      output_config: { effort: EFFORT },
      system,
      messages: [
        {
          role: "user",
          content: [
            ...images.map((image) => ({
              type: "image" as const,
              source: { type: "base64" as const, media_type: image.mediaType, data: image.data },
            })),
            { type: "text" as const, text: prompt },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ reason: "refused" }, { status: 422 });
    }

    raw = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ reason: "no-api-key" }, { status: 501 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ reason: "rate-limited" }, { status: 429 });
    }
    return NextResponse.json({ reason: "failed" }, { status: 502 });
  }

  const parsed = parseJsonArray(raw);
  if (!parsed) return NextResponse.json({ reason: "failed" }, { status: 502 });

  // Alinha pelo índice, não pelo tamanho que o modelo devolveu: item a mais
  // é ignorado, item a menos vira um objeto vazio (peça sem sugestão, e não
  // uma resposta inteira derrubada por causa de uma peça só).
  const aligned = images.map((_, index) => parsed[index]);
  return NextResponse.json(aligned.map(validate));
}

/* -------------------------------------------------------------------------
   Entrada e validação
   ------------------------------------------------------------------------- */

export type ClassifiedItem = {
  name?: string;
  category?: CategoryId;
  shape?: GarmentShape;
  fullBody?: boolean;
  color?: string;
  season?: string;
  formality?: string;
};

/** Só aceita data URL de imagem (`data:image/png;base64,...`), o formato que
 * o próprio `canvas.toBlob` do app já produz para cada recorte. Qualquer
 * outra coisa é descartada, não derruba a rota inteira por uma entrada
 * malformada. */
function parseDataUrl(src: string): ImageInput | null {
  const match = /^data:(image\/png|image\/jpeg);base64,(.+)$/.exec(src);
  if (!match) return null;
  return { mediaType: match[1] as "image/png" | "image/jpeg", data: match[2] };
}

/** O modelo pode embrulhar o JSON em cerca de código mesmo instruído a não fazer. */
function parseJsonArray(raw: string): unknown[] | null {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Mesma validação item a item que a rota de enrich já faz: só passa adiante
 * valor que existe de verdade no vocabulário do app. Campo fora da lista
 * vira ausente, e o formulário mantém o padrão dele.
 */
function validate(parsed: unknown): ClassifiedItem {
  const item = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};

  const pick = (value: unknown, allowed: string[]) =>
    typeof value === "string" && allowed.includes(value) ? value : undefined;

  const categoryIds = CATEGORIES.map((category) => category.id);
  const category = pick(item.category, categoryIds) as CategoryId | undefined;

  const allowedShapes = category
    ? SHAPE_OPTIONS[category].map((shape) => shape.value)
    : Object.values(SHAPE_OPTIONS).flatMap((list) => list.map((shape) => shape.value));
  const shape = pick(item.shape, allowedShapes) as GarmentShape | undefined;

  const name = typeof item.name === "string" ? item.name.trim().slice(0, 60) : undefined;

  return {
    name: name || undefined,
    category,
    shape,
    fullBody: shape === "vestido" ? true : item.fullBody === true,
    color: pick(item.color, COLOR_SUGGESTIONS),
    season: pick(item.season, SEASONS),
    formality: pick(item.formality, FORMALITIES),
  };
}
