-- Motivo de cancelación de una cita (se envía al cliente por WhatsApp).
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancel_reason text
  CONSTRAINT appointments_cancel_reason_check CHECK (char_length(cancel_reason) <= 500);
