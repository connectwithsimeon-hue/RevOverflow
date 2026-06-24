-- Loyalty program — a simple "earn a reward every N visits" punch-card that
-- RevOverflow runs itself off the visit data it already has (customers.total_orders).
-- No Square Loyalty integration required, so it works for EVERY merchant.
-- Yara tracks each customer's progress and nudges those close to a reward.

create table if not exists loyalty_programs (
  id              uuid primary key default uuid_generate_v4(),
  merchant_id     uuid not null references merchants(id) on delete cascade,
  reward_name     text not null,              -- e.g. "Free wash", "Free coffee"
  visits_required integer not null default 10, -- visits to earn one reward
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (merchant_id)
);

create index if not exists idx_loyalty_merchant on loyalty_programs(merchant_id);

-- Row-level security — same merchant-isolation pattern as the rest of the schema.
alter table loyalty_programs enable row level security;
create policy loyalty_isolation on loyalty_programs
  for all using (merchant_id in (select id from merchants where auth_user_id = auth.uid()));
