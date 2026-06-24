-- Lightspeed Retail (X-Series) POS support — mirrors the Square/Clover/Toast
-- columns so the same sync/attribution pipeline works for Lightspeed merchants.

-- Merchant connection (tokens encrypted at the app layer before insert).
alter table merchants add column if not exists lightspeed_domain_prefix text;
alter table merchants add column if not exists lightspeed_access_token  text;
alter table merchants add column if not exists lightspeed_refresh_token text;
alter table merchants add column if not exists lightspeed_token_expires timestamptz;

-- Customer identity from Lightspeed (customer-match merges by phone/email).
alter table customers add column if not exists lightspeed_customer_id text;
create index if not exists idx_customers_lightspeed on customers(merchant_id, lightspeed_customer_id);

-- Order identity from Lightspeed sales (unique per merchant so upserts dedupe).
alter table orders add column if not exists lightspeed_sale_id text;
create unique index if not exists uq_orders_lightspeed on orders(merchant_id, lightspeed_sale_id);

-- RLS already covers merchants/customers/orders via the existing isolation
-- policies; new columns inherit them automatically.
