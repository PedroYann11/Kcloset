/**
 * Redimensiona a foto da peça antes de guardar.
 *
 * PNG, não JPEG: a foto agora vive em IndexedDB como Blob, não mais em texto
 * base64 dentro do localStorage, então o motivo antigo de comprimir agressivo
 * para caber na cota não existe mais, e PNG é o formato que sabe guardar
 * transparência, o que o recorte de fundo (fase seguinte do projeto) precisa.
 *
 * A proporção real da imagem é devolvida junto, para a peça aparecer inteira
 * em vez de espremida num quadro fixo. Ver `garmentAspect` em GarmentView.
 */

/** Lado maior da imagem final, em pixels. */
export const MAX_SIDE = 800;

export type CompressedPhoto = {
  /** A imagem já redimensionada, em PNG. */
  blob: Blob;
  /** Largura / altura da imagem final. */
  aspect: number;
};

export async function compressImage(file: File, maxSide: number = MAX_SIDE): Promise<CompressedPhoto> {
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

    ctx.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Não foi possível gerar a foto.");

    return { blob, aspect: width / height };
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
