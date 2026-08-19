/**
 * Redimensiona e comprime a foto da peça antes de guardar.
 *
 * A foto vai para o localStorage em base64 junto com a peça, então precisa
 * chegar pequena: ~800px no lado maior e JPEG a 0.8 deixa cada peça em torno
 * de 100–200 KB, o que cabe com folga na cota do navegador.
 */

/** Lado maior da imagem final, em pixels. */
export const MAX_SIDE = 800;

/** Qualidade do JPEG gerado (0–1). */
export const JPEG_QUALITY = 0.8;

export async function compressImage(
  file: File,
  maxSide: number = MAX_SIDE,
  quality: number = JPEG_QUALITY,
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);

    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível preparar a imagem neste navegador.");

    // JPEG não tem canal alfa: sem esse fundo, PNGs transparentes saem com preto.
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível ler a imagem escolhida."));
    image.src = src;
  });
}
