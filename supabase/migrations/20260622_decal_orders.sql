-- Decal / glass-print fulfillment orders (Gelato print-on-demand)
-- Free with any paid plan. Each decal links back to the merchant's existing
-- VIP signup QR code, so a customer who scans it and signs up gets matched
-- to their POS payment history the same way any other VIP signup does
-- (see lib/customer-match.ts) — no new matching logic needed.
create table if not exists decal_orders (
  id                uuid primary key default gen_random_uuid(),
  merchant_id       uuid not null references merchants(id) on delete cascade,
  product_type      text not null check (product_type in ('table_decal', 'glass_print')),
  status            text not null default 'pending' check (status in ('pending', 'submitted', 'printed', 'shipped', 'delivered', 'cancelled', 'failed')),
  gelato_order_id   text,
  design_url        text,
  shipping_name     text not null,
  shipping_address1 text not null,
  shipping_address2 text,
  shipping_city     text not null,
  shipping_state    text,
  shipping_postcode text not null,
  shipping_country  text not null default 'US',
  shipping_phone    text,
  shipping_email    text not null,
  tracking_url      text,
  error_message     text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index if not exists idx_decal_orders_merchant on decal_orders(merchant_id);
