/**
 * Recorte de fundo: de uma peça por foto (`computeAlphaMask` e vizinhas) até
 * várias peças deitadas juntas na mesma foto (`findIslands`, componente
 * conectado por cima da mesma máscara de distância de cor).
 *
 * Cada função aqui é pura, só matemática sobre `ImageData`, sem tocar em
 * canvas nem em React: quem desenha na tela é `CutoutEditor.tsx`, e quem
 * dispara o processamento em lote é `BatchReviewScreen.tsx`.
 *
 * A ideia central: cada pixel vira transparente ou opaco pela distância de
 * cor até o fundo, com uma faixa de transição no meio para a borda sair
 * suave em vez de serrilhada. Um apagador manual pode forçar um pixel a
 * transparente por cima disso, e nunca é desfeito ao mexer na tolerância.
 * Separar peças na mesma foto soma mais uma camada: depois de decidir fundo
 * e frente por cor, `findIslands` agrupa os pixels de frente por
 * vizinhança, um pixel só pertence à mesma peça se dá para chegar nele
 * andando por outros pixels de frente, sem pular o vazio.
 */

export type RGB = { r: number; g: number; b: number };
export type Box = { x: number; y: number; width: number; height: number };

/** Quanto a faixa de transição (de totalmente opaco a totalmente
 * transparente) se estende além do limiar de tolerância, em unidades de
 * distância de cor. */
const FEATHER = 22;

/** Tolerância inicial da régua no editor manual, e a usada sem pergunta
 * nenhuma quando o recorte roda sozinho, no cadastro em lote. */
export const DEFAULT_TOLERANCE = 40;

/** Amostra a cor de fundo pela média de um anel fino nas bordas da imagem.
 * É a mesma orientação que já demos para a foto de várias peças: deixe a
 * peça longe da borda. */
export function sampleBackground(imageData: ImageData): RGB {
  const { data, width, height } = imageData;
  const ringWidth = Math.max(4, Math.round(Math.min(width, height) * 0.03));

  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  const add = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  };

  for (let x = 0; x < width; x++) {
    for (let ring = 0; ring < ringWidth; ring++) {
      add(x, ring);
      add(x, height - 1 - ring);
    }
  }
  // As linhas de cima e de baixo já cobrem os cantos, então as laterais
  // começam depois delas para não contar o mesmo pixel duas vezes.
  for (let y = ringWidth; y < height - ringWidth; y++) {
    for (let ring = 0; ring < ringWidth; ring++) {
      add(ring, y);
      add(width - 1 - ring, y);
    }
  }

  return count > 0 ? { r: r / count, g: g / count, b: b / count } : { r: 255, g: 255, b: 255 };
}

/** Por pixel, distância euclidiana até a cor de fundo vira alfa: dentro do
 * limiar é transparente, fora dele mais a faixa de transição é opaco, e
 * entre os dois interpola. */
export function computeAlphaMask(
  imageData: ImageData,
  background: RGB,
  tolerance: number,
): Uint8ClampedArray {
  const { data, width, height } = imageData;
  const pixelCount = width * height;
  const mask = new Uint8ClampedArray(pixelCount);

  const inner = 8 + tolerance * 1.1;
  const outer = inner + FEATHER;
  const span = outer - inner;

  for (let p = 0; p < pixelCount; p++) {
    const i = p * 4;
    const dr = data[i] - background.r;
    const dg = data[i + 1] - background.g;
    const db = data[i + 2] - background.b;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);

    if (distance <= inner) mask[p] = 0;
    else if (distance >= outer) mask[p] = 255;
    else mask[p] = ((distance - inner) / span) * 255;
  }

  return mask;
}

/** Array "sem apagador nenhum": todo pixel livre para o que a máscara calculada decidir. */
export function freshManualErase(pixelCount: number): Uint8ClampedArray {
  return new Uint8ClampedArray(pixelCount).fill(255);
}

/** Marca um círculo como apagado no apagador manual, em pixels da imagem. */
export function eraseCircle(
  manualErase: Uint8ClampedArray,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
): void {
  const r2 = radius * radius;
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(width - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(height - 1, Math.ceil(cy + radius));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) manualErase[y * width + x] = 0;
    }
  }
}

/** Combina a máscara calculada com o apagador manual: o alfa final é sempre
 * o menor dos dois, então apagar à mão nunca é desfeito pela régua de
 * tolerância. */
export function compositeAlpha(
  mask: Uint8ClampedArray,
  manualErase: Uint8ClampedArray,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(mask.length);
  for (let p = 0; p < mask.length; p++) out[p] = Math.min(mask[p], manualErase[p]);
  return out;
}

/** Cópia da imagem original com esse alfa aplicado, pronta para desenhar. */
export function withAlpha(imageData: ImageData, alpha: Uint8ClampedArray): ImageData {
  const out = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
  for (let p = 0; p < alpha.length; p++) out.data[p * 4 + 3] = alpha[p];
  return out;
}

/** Caixa justa dos pixels visíveis, com uma margem pequena. `null` quando a
 * imagem inteira ficou transparente. */
export function boundingBox(
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
  threshold = 16,
): Box | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (alpha[y * width + x] > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;

  const padX = Math.round((maxX - minX + 1) * 0.04);
  const padY = Math.round((maxY - minY + 1) * 0.04);

  const x = Math.max(0, minX - padX);
  const y = Math.max(0, minY - padY);
  const right = Math.min(width, maxX + 1 + padX);
  const bottom = Math.min(height, maxY + 1 + padY);

  return { x, y, width: right - x, height: bottom - y };
}

/** Recorta uma sub-região da imagem, pixel a pixel, sem canvas. Funciona
 * dentro de um Web Worker também, caso isso um dia seja necessário. */
export function cropImageData(source: ImageData, box: Box): ImageData {
  const out = new ImageData(box.width, box.height);
  for (let y = 0; y < box.height; y++) {
    const srcStart = ((y + box.y) * source.width + box.x) * 4;
    const row = source.data.subarray(srcStart, srcStart + box.width * 4);
    out.data.set(row, y * box.width * 4);
  }
  return out;
}

/** Uma peça separada dentro de uma foto com várias. O alfa já vem cortado
 * pela caixa própria da peça, sem pixel de nenhuma peça vizinha misturado. */
export type Island = { box: Box; alpha: Uint8ClampedArray };

/** Fração mínima da área da imagem para uma ilha contar como peça, e não
 * como ruído (sombra, dobra do tecido, poeira no fundo). */
const MIN_ISLAND_AREA_RATIO = 0.006;

/** Um pixel de máscara acima disso conta como frente, na mesma régua que
 * `boundingBox` já usa pra decidir o que é peça visível. */
const FOREGROUND_THRESHOLD = 127;

/**
 * Separa cada silhueta isolada de frente numa peça própria. Primeiro decide
 * fundo e frente pixel a pixel do mesmo jeito que `computeAlphaMask`
 * (distância de cor), depois soma o que só isso não resolve: busca de
 * componente conectado (preenchimento por vizinhança de 4 direções, pilha
 * explícita em vez de recursão, pra não estourar a pilha de chamadas numa
 * foto grande) pra saber quais pixels de frente pertencem à mesma peça.
 *
 * Duas peças perto uma da outra podem ter caixas que se sobrepõem um pouco
 * mesmo sem se tocar. Por isso o alfa de cada ilha é um array novo do
 * tamanho da própria caixa, não um pedaço do array de máscara
 * compartilhado: todo pixel que cai dentro da caixa mas pertence a outra
 * ilha (ou ao fundo) fica transparente, senão o canto de uma peça vizinha
 * vazaria colado na peça errada.
 */
export function findIslands(
  imageData: ImageData,
  background: RGB,
  tolerance: number,
  minAreaRatio: number = MIN_ISLAND_AREA_RATIO,
): Island[] {
  const { width, height } = imageData;
  const pixelCount = width * height;
  const mask = computeAlphaMask(imageData, background, tolerance);

  const labels = new Int32Array(pixelCount).fill(-1);
  const stack = new Int32Array(pixelCount);

  type Region = { label: number; minX: number; minY: number; maxX: number; maxY: number; count: number };
  const regions: Region[] = [];

  for (let start = 0; start < pixelCount; start++) {
    if (mask[start] <= FOREGROUND_THRESHOLD || labels[start] !== -1) continue;

    const label = regions.length;
    let top = 0;
    stack[top++] = start;
    labels[start] = label;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let count = 0;

    while (top > 0) {
      const p = stack[--top];
      const x = p % width;
      const y = (p / width) | 0;

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      count++;

      if (x > 0) {
        const n = p - 1;
        if (mask[n] > FOREGROUND_THRESHOLD && labels[n] === -1) {
          labels[n] = label;
          stack[top++] = n;
        }
      }
      if (x < width - 1) {
        const n = p + 1;
        if (mask[n] > FOREGROUND_THRESHOLD && labels[n] === -1) {
          labels[n] = label;
          stack[top++] = n;
        }
      }
      if (y > 0) {
        const n = p - width;
        if (mask[n] > FOREGROUND_THRESHOLD && labels[n] === -1) {
          labels[n] = label;
          stack[top++] = n;
        }
      }
      if (y < height - 1) {
        const n = p + width;
        if (mask[n] > FOREGROUND_THRESHOLD && labels[n] === -1) {
          labels[n] = label;
          stack[top++] = n;
        }
      }
    }

    regions.push({ label, minX, minY, maxX, maxY, count });
  }

  const minPixels = minAreaRatio * pixelCount;

  const islands: Island[] = regions
    .filter((region) => region.count >= minPixels)
    .map((region) => {
      const padX = Math.round((region.maxX - region.minX + 1) * 0.04);
      const padY = Math.round((region.maxY - region.minY + 1) * 0.04);
      const x = Math.max(0, region.minX - padX);
      const y = Math.max(0, region.minY - padY);
      const right = Math.min(width, region.maxX + 1 + padX);
      const bottom = Math.min(height, region.maxY + 1 + padY);
      const box: Box = { x, y, width: right - x, height: bottom - y };

      // Alfa novo do tamanho da caixa: só entra o pixel que é desta ilha,
      // o resto (fundo ou peça vizinha que caiu dentro da mesma caixa)
      // fica em 0, o valor padrão de um Uint8ClampedArray recém-criado.
      const alpha = new Uint8ClampedArray(box.width * box.height);
      for (let by = 0; by < box.height; by++) {
        for (let bx = 0; bx < box.width; bx++) {
          const sourceP = (box.y + by) * width + (box.x + bx);
          if (labels[sourceP] === region.label) {
            alpha[by * box.width + bx] = mask[sourceP];
          }
        }
      }

      return { box, alpha };
    });

  // De cima pra baixo, esquerda pra direita pelo centro da caixa, pra bater
  // com a ordem que a usuária via as peças na foto.
  islands.sort((a, b) => {
    const centerAY = a.box.y + a.box.height / 2;
    const centerBY = b.box.y + b.box.height / 2;
    return centerAY - centerBY || a.box.x - b.box.x;
  });

  return islands;
}
