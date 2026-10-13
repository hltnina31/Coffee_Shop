-- Apply once using an owner connection on an explicitly approved branch.
BEGIN;
CREATE TABLE reservation_requests (
  reference uuid PRIMARY KEY,
  idempotency_key uuid NOT NULL UNIQUE,
  intent_created_at timestamptz NOT NULL,
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  name text NOT NULL CHECK (name = btrim(name) AND char_length(name) BETWEEN 1 AND 100),
  email text NOT NULL CHECK (email = btrim(email) AND char_length(email) BETWEEN 3 AND 254
    AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  guest_count smallint NOT NULL CHECK (guest_count BETWEEN 1 AND 8),
  requested_date date NOT NULL,
  requested_time time NOT NULL,
  requested_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status = 'pending'),
  CHECK (extract(second FROM requested_time) = 0 AND extract(minute FROM requested_time) IN (0, 30)),
  CHECK (CASE WHEN extract(isodow FROM requested_date) IN (6, 7)
    THEN requested_time >= time '12:00' AND requested_time < time '18:00'
    ELSE requested_time >= time '10:00' AND requested_time < time '19:00' END),
  CHECK (requested_at = (requested_date + requested_time) AT TIME ZONE 'Europe/Oslo')
);
CREATE INDEX reservation_requests_created_at ON reservation_requests (created_at);
REVOKE ALL ON reservation_requests FROM PUBLIC;
-- Set this role's password separately in Neon; never add it to this file.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'reservation_app') THEN
    CREATE ROLE reservation_app LOGIN;
  END IF;
END $$;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO reservation_app;
GRANT INSERT (reference, idempotency_key, intent_created_at, payload_hash, name, email,
  guest_count, requested_date, requested_time, requested_at) ON reservation_requests TO reservation_app;
GRANT SELECT (reference, idempotency_key, intent_created_at, payload_hash, guest_count,
  requested_date, requested_time, created_at, status) ON reservation_requests TO reservation_app;
GRANT DELETE ON reservation_requests TO reservation_app;
COMMIT;
