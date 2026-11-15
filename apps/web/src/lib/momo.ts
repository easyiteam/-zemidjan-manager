/** Extrait montant / ID transaction / expéditeur / date d'un SMS de confirmation Mobile Money. */
export interface ParsedSms {
  amount?: number;
  reference?: string;
  phone?: string;
  date?: string;
}

// Espace insécable et espace fine insécable : séparateurs de milliers parfois
// utilisés dans les SMS d'opérateurs (ex. "25<nbsp>000 FCFA"). Construits via
// fromCharCode pour ne jamais écrire de caractère Unicode littéral dans le
// source (no-irregular-whitespace).
const NBSP = String.fromCharCode(0x00a0);
const NNBSP = String.fromCharCode(0x202f);
const THOUSANDS_SEP = `[ .${NBSP}${NNBSP}]`;

export function parseMomoSms(text: string): ParsedSms {
  const out: ParsedSms = {};

  const amount = text.match(
    new RegExp(`(\\d{1,3}(?:${THOUSANDS_SEP}?\\d{3})+|\\d{3,})\\s*(?:F\\s?CFA|FCFA|XOF|F\\b)`, "i"),
  );
  if (amount) out.amount = Number(amount[1]!.replace(/\D/g, ""));

  const ref = text.match(
    /(?:ID|Id|Transaction|Trans\.?|R[ée]f(?:[ée]rence)?)\s*(?:de\s+transaction)?\s*[:#n°.]*\s*([A-Z0-9.]{6,})/i,
  );
  if (ref) out.reference = ref[1]!.replace(/\.$/, "");

  const tel = text.match(/(?:\+?229\s?)?(01\s?\d{2}(?:\s?\d{2}){3}|\d{8})(?!\d)/);
  if (tel) out.phone = tel[0].replace(/\s/g, "");

  const date = text.match(/(\d{4})-(\d{2})-(\d{2})|(\d{2})\/(\d{2})\/(\d{4})/);
  if (date) out.date = date[1] ? `${date[1]}-${date[2]}-${date[3]}` : `${date[6]}-${date[5]}-${date[4]}`;

  return out;
}

/** Réduit une image avant envoi (taille max en px côté le plus grand, JPEG). */
export async function shrinkImage(file: File, max = 1600): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponible");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Compression échouée"))), "image/jpeg", 0.82);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
