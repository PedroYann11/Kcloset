/**
 * Recorte de fundo, uma foto por vez.
 *
 * Cada função aqui é pura, só matemática sobre `ImageData`, sem tocar em
 * canvas nem em React: quem desenha na tela é `CutoutEditor.tsx`. Reservado
 * para uma peça por foto; separar várias peças na mesma imagem (achar cada
 * silhueta) é trabalho de outra natureza, componente conectado em vez de
 * distância de cor, e fica para quando o app precisar disso de verdade.
 *
 * A ideia central: cada pixel vira transparente ou opaco pela distância de
 * cor até o fundo, com uma faixa de transição no meio para a borda sair
 * suave em vez de serrilhada. Um apagador manual pode forçar um pixel a
 * transparente por cima disso, e nunca é desfeito ao mexer na tolerância.
 */

export type RGB = { r: number; g: number; b: number };
export type Box = { x: number; y: number; width: number; height: number };

/** Quanto a faixa de transição (de totalmente opaco a totalmente
 * transparente) se estende além do limiar de tolerância, em unidades de
 * distância de cor. */
const FEATHER = 22;

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
