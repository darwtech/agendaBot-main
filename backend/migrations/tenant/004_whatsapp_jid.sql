-- Clientes que llegan por WhatsApp sin número visible (WhatsApp usa un id interno "LID", p. ej. 12345@lid).
ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp_jid text
  CONSTRAINT customers_whatsapp_jid_check CHECK (char_length(whatsapp_jid) BETWEEN 3 AND 200);
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_contact_required;
ALTER TABLE customers ADD CONSTRAINT customers_contact_required
  CHECK (phone IS NOT NULL OR email IS NOT NULL OR whatsapp_jid IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_whatsapp_jid ON customers (whatsapp_jid) WHERE deleted_at IS NULL;
