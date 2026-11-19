/**
 * Construye `col = $n, ...` a partir de un patch parcial, usando un mapa campo→columna.
 * Ignora campos undefined y añade updated_by. Devuelve null si no hay nada que actualizar.
 */
export function buildUpdate(
  columns: Record<string, string>,
  patch: Record<string, unknown>,
  actor: string | null,
  firstIndex = 1
): { set: string; values: unknown[] } | null {
  const parts: string[] = [];
  const values: unknown[] = [];
  for (const [field, column] of Object.entries(columns)) {
    if (patch[field] === undefined) continue;
    values.push(patch[field]);
    parts.push(`${column} = $${firstIndex + values.length - 1}`);
  }
  if (!parts.length) return null;
  values.push(actor);
  parts.push(`updated_by = $${firstIndex + values.length - 1}`);
  return { set: parts.join(', '), values };
}

/**
 * El contacto es un único texto: chat de WhatsApp sin número (…@lid / …@s.whatsapp.net),
 * email (si lleva @) o teléfono (solo dígitos).
 */
export function splitContact(contact: string): { phone: string | null; email: string | null; whatsappJid: string | null } {
  const value = contact.trim();
  if (/@(lid|s\.whatsapp\.net)$/i.test(value)) return { phone: null, email: null, whatsappJid: value.toLowerCase() };
  if (value.includes('@')) return { phone: null, email: value.toLowerCase(), whatsappJid: null };
  return { phone: value.replace(/\D/g, ''), email: null, whatsappJid: null };
}
