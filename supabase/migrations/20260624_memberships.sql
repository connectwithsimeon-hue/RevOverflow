-- Membership offers — RevOverflow promotes and tracks them, but NEVER processes
-- the payment. The recurring charge lives in the merchant's own system (e.g.
-- Square subscriptions); the merchant just gives us their signup link. This
-- keeps RevOverflow out of money-handling / payment-facilitator territory.
--
-- One membership offer per merchant for now (a merchant can edit it).

create table if not exists memberships (
  id              uuid primary key default uuid_generate_v4(),
  merchant_id     uuid not null references merchants(id) on delete cascade,
  name            text not null,
  monthly_price   numeric(12,2) not null default 0,
  perks           text,                       -- free text, one perk per line
  signup_url      text,                       -- the merchant's OWN checkout / Square link
  current_members integer not null default 0, -- merchant-maintained (they know from their POS)
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (merchant_id)
);

create index if not exists idx_memberships_merchant on memberships(merchant_id);

-- Row-level security — same merchant-isolation pattern as the rest of the schema.
alter table memberships enable row level security;
create policy memberships_isolation on memberships
  for all using (merchant_id in (select id from merchants where auth_user_id = auth.uid()));
