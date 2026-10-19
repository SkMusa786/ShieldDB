-- ShieldDB application tables
-- Safe to run repeatedly: no Neon Auth tables are altered and existing rows are preserved.

CREATE TABLE IF NOT EXISTS public.customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  credit_card TEXT NOT NULL,
  account_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.masking_policies (
  id BIGSERIAL PRIMARY KEY,
  role TEXT NOT NULL UNIQUE CHECK (role IN ('Admin', 'Support Staff', 'Data Analyst')),
  name_policy TEXT NOT NULL,
  email_policy TEXT NOT NULL,
  phone_policy TEXT NOT NULL,
  credit_card_policy TEXT NOT NULL,
  account_balance_policy TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  role TEXT NOT NULL,
  table_name TEXT NOT NULL,
  field TEXT,
  method TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS customers_created_at_idx ON public.customers (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at DESC);

INSERT INTO public.customers (name, email, phone, credit_card, account_balance)
VALUES
  ('Avery Morgan', 'avery.morgan@example.test', '+1-415-555-0142', '4111111111111111', 2840.75),
  ('Priya Shah', 'priya.shah@example.test', '+1-212-555-0188', '5555555555554444', 125.00),
  ('Mateo Rivera', 'mateo.rivera@example.test', '+1-512-555-0127', '378282246310005', 9132.40),
  ('Sofia Bennett', 'sofia.bennett@example.test', '+1-206-555-0164', '6011111111111117', 476.18),
  ('Liam Chen', 'liam.chen@example.test', '+1-312-555-0191', '30569309025904', 0.00)
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.masking_policies (role, name_policy, email_policy, phone_policy, credit_card_policy, account_balance_policy)
VALUES
  ('Admin', 'full', 'full', 'full', 'full', 'full'),
  ('Support Staff', 'full', 'partial', 'last4', 'last4', 'redact'),
  ('Data Analyst', 'full', 'hash', 'redact', 'redact', 'redact')
ON CONFLICT (role) DO NOTHING;

INSERT INTO public.audit_logs (action, actor, role, table_name, field, method, success)
SELECT seed.action, seed.actor, seed.role, seed.table_name, seed.field, seed.method, seed.success
FROM (VALUES
  ('database_scan', 'system', 'Admin', 'customers', 'email', 'column-name rule', true),
  ('database_scan', 'system', 'Admin', 'customers', 'phone', 'column-name rule', true),
  ('database_scan', 'system', 'Admin', 'customers', 'credit_card', 'column-name rule', true),
  ('database_scan', 'system', 'Admin', 'customers', 'account_balance', 'column-name rule', true),
  ('policy_initialized', 'system', 'Admin', 'masking_policies', NULL, 'default policy seed', true)
) AS seed(action, actor, role, table_name, field, method, success)
WHERE NOT EXISTS (
  SELECT 1 FROM public.audit_logs existing
  WHERE existing.action = seed.action
    AND existing.actor = seed.actor
    AND existing.table_name = seed.table_name
    AND existing.method = seed.method
);
