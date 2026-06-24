-- Product cost data, entered by the merchant, so Yara can do margin-aware
-- (Profit Engine) recommendations and margin-protected promotions.
--
-- Square / Clover / Toast give us the SELLING price (order_items.unit_price)
-- but never the COST. The merchant enters cost once per product here; margin
-- is then computed as (avg selling price - unit_cost) / avg selling price.
--
-- Keyed by (merchant_id, catalog_name) so each product has one cost row.

create table if not exists product_costs (
  id           uuid primary key default uuid_generate_v4(),
  merchant_id  uuid not null references merchants(id) on delete cascade,
  catalog_name text not null,
  unit_cost    numeric(12,2) not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (merchant_id, catalog_name)
);

create index if not exists idx_product_costs_merchant on product_costs(merchant_id);

-- Row-level security — same merchant-isolation pattern as customers/orders/etc.
-- The app accesses this table via the service role (which bypasses RLS); this
-- policy locks out any direct anon/auth-key access to other merchants' rows.
alter table product_costs enable row level security;
create policy product_costs_isolation on product_costs
  for all using (merchant_id in (select id from merchants where auth_user_id = auth.uid()));
