BEGIN;
SELECT pg_advisory_xact_lock(74201849);
CREATE TABLE IF NOT EXISTS prk_sessions (
  id uuid PRIMARY KEY, token_hash char(64) UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS prk_orders (
  id uuid PRIMARY KEY, creator_session uuid NOT NULL REFERENCES prk_sessions(id),
  idempotency_key uuid NOT NULL, request_hash char(64) NOT NULL,
  product_id text NOT NULL CHECK (product_id IN ('zip-day','print-day','donation')),
  mode text NOT NULL CHECK (mode IN ('test','live')),
  amount_paise integer NOT NULL CHECK (amount_paise >= 500 AND amount_paise <= 100000),
  currency text NOT NULL CHECK (currency = 'INR'),
  email_encrypted text NOT NULL, recovery_encrypted text NOT NULL, recovery_hash char(64) UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'creating' CHECK (status IN ('creating','pending','paid','expired','cancelled','failed','refunded','disputed')),
  link_id text UNIQUE, checkout_url text, payment_id text UNIQUE,
  paid_at timestamptz, expires_at timestamptz, revoked_at timestamptz,
  refunded_paise integer NOT NULL DEFAULT 0 CHECK (refunded_paise >= 0),
  gateway_fee_paise integer, gateway_tax_paise integer,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_session, idempotency_key)
);
CREATE TABLE IF NOT EXISTS prk_order_access (
  session_id uuid NOT NULL REFERENCES prk_sessions(id), order_id uuid NOT NULL REFERENCES prk_orders(id),
  PRIMARY KEY (session_id, order_id)
);
CREATE TABLE IF NOT EXISTS prk_payment_events (
  event_id text PRIMARY KEY, event_type text NOT NULL,
  order_id uuid REFERENCES prk_orders(id), payment_id text,
  outcome text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prk_orders_reconcile ON prk_orders (updated_at) WHERE status IN ('creating','pending','paid');
CREATE INDEX IF NOT EXISTS prk_events_order ON prk_payment_events (order_id, created_at);
CREATE INDEX IF NOT EXISTS prk_events_payment ON prk_payment_events (payment_id, event_type);
CREATE TABLE IF NOT EXISTS prk_refunds (
  refund_id text PRIMARY KEY, payment_id text NOT NULL,
  amount_paise integer NOT NULL CHECK(amount_paise>0), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prk_refunds_payment ON prk_refunds(payment_id);
COMMIT;
