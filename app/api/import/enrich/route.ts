import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { SHAPE_OPTIONS } from "@/components/icons/garments";
import { CATEGORIES, COLOR_SUGGESTIONS, FORMALITIES, SEASONS } from "@/data/seed-items";
import { parsePublicUrl } from "@/lib/link-import";
import type { CategoryId, GarmentShape } from "@/types";

/**
 * Olha as fotos do anúncio e devolve a peça já preenchida.
 *
 * São duas perguntas numa só chamada: qual das fotos serve de foto de closet
 * (o still da roupa, não a modelo em cenário), e como classificar a peça no
 * vocabulário do app. O que vem de volta é validado contra as listas reais
 * antes de chegar no formulário, porque campo inventado sujaria o acervo.
 *
 * Sem `ANTHROPIC_API_KEY` a rota responde 501 e o app segue funcionando: a
 * usuária escolhe a foto e preenche na mão, como sempre pôde.
 */

/** Uma escolha de foto com alguns campos é tarefa simples, não precisa de esforço alto. */
const EFFORT = "low" as const;

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ reason: "no-api-key" }, { status: 501 });
  }

  let body: { images?: string[]; title?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ reason: "invalid-body" }, { status: 400 });
  }

  const images = (body.images ?? []).filter((src) => parsePublicUrl(src)).slice(0, 6);
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

Recebe as fotos de um anúncio de loja e responde SOMENTE com um objeto JSON, sem texto em volta e sem cercas de código.

Campos:
- "bestImage": índice (base 0) da foto que melhor serve de foto de catálogo do closet. Prefira a peça sozinha, inteira e bem enquadrada, de preferência em fundo liso. Evite foto de modelo de corpo inteiro em cenário, closes de detalhe, tabela de medidas e imagem com muito texto.
- "name": nome curto em português, no máximo 5 palavras, como "Blusa de manga curta rosa".
- "category" e "shape", combinando com a lista:
${shapesByCategory}
- "fullBody": true apenas para vestido ou macacão.
- "color": um de ${COLOR_SUGGESTIONS.join(", ")}.
- "season": um de ${SEASONS.join(", ")}.
- "formality": um de ${FORMALITIES.join(", ")}.

Quando estiver em dúvida em algum campo, escolha o valor mais neutro da lista.`;

  const prompt = [
    body.title ? `Título do anúncio: ${body.title}` : "O anúncio não trouxe título.",
    `São ${images.length} foto(s), na ordem em que aparecem.`,
  ].join("\n");

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
            ...images.map((url) => ({
              type: "image" as const,
              source: { type: "url" as const, url },
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

  const parsed = parseJson(raw);
  if (!parsed) return NextResponse.json({ reason: "failed" }, { status: 502 });

  return NextResponse.json(validate(parsed, images.length));
}

/* -------------------------------------------------------------------------
   Validação
   ------------------------------------------------------------------------- */

export type EnrichedItem = {
  bestImage: number;
  name?: string;
  category?: CategoryId;
  shape?: GarmentShape;
  fullBody?: boolean;
  color?: string;
  season?: string;
  formality?: string;
};

/** O modelo pode embrulhar o JSON em cerca de código mesmo instruído a não fazer. */
function parseJson(raw: string): Record<string, unknown> | null {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Só passa adiante valor que existe de verdade no vocabulário do app. Campo
 * fora da lista vira ausente, e o formulário mantém o padrão dele.
 */
function validate(parsed: Record<string, unknown>, imageCount: number): EnrichedItem {
  const pick = (value: unknown, allowed: string[]) =>
    typeof value === "string" && allowed.includes(value) ? value : undefined;

  const categoryIds = CATEGORIES.map((category) => category.id);
  const category = pick(parsed.category, categoryIds) as CategoryId | undefined;

  const allowedShapes = category
    ? SHAPE_OPTIONS[category].map((shape) => shape.value)
    : Object.values(SHAPE_OPTIONS).flatMap((list) => list.map((shape) => shape.value));
  const shape = pick(parsed.shape, allowedShapes) as GarmentShape | undefined;

  const index = Number(parsed.bestImage);
  const bestImage = Number.isInteger(index) && index >= 0 && index < imageCount ? index : 0;

  const name = typeof parsed.name === "string" ? parsed.name.trim().slice(0, 60) : undefined;

  return {
    bestImage,
    name: name || undefined,
    category,
    shape,
    fullBody: shape === "vestido" ? true : parsed.fullBody === true,
    color: pick(parsed.color, COLOR_SUGGESTIONS),
    season: pick(parsed.season, SEASONS),
    formality: pick(parsed.formality, FORMALITIES),
  };
}
