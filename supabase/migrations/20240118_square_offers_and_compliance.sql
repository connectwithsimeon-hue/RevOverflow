-- Square offers table (promo codes created by Yara)
create table if not exists square_offers (
  id              uuid primary key default gen_random_uuid(),
  merchant_id     uuid not null references merchants(id) on delete cascade,
  discount_id     text,
  pricing_rule_id text,
  promo_code      text not null,
  offer_type      text not null check (offer_type in ('percentage', 'fixed_amount')),
  value           numeric(10,2) not null,
  name            text,
  max_uses        integer default 0,
  uses_count      integer default 0,
  expires_at      timestamptz,
  created_at      timestamptz default now()
);

-- Compliance: track last message sent per customer per channel
-- Used by the compliance gate to enforce rate limits
alter table customers
  add column if not exists sms_opt_out         boolean default false,
  add column if not exists email_opt_out        boolean default false,
  add column if not exists last_sms_sent_at     timestamptz,
  add column if not exists last_email_sent_at   timestamptz,
  add column if not exists sms_double_opt_in    boolean default false,   -- true once confirmed
  add column if not exists sms_opt_in_pending   boolean default false,   -- awaiting confirmation
  add column if not exists favorite_items       text[] default '{}',
  add column if not exists first_purchase_at    timestamptz;

-- Double opt-in pending table (SMS confirmation)
create table if not exists sms_opt_in_pending (
  id          uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  phone       text not null,
  token       text not null,                     -- random 6-char code
  sent_at     timestamptz default now(),
  confirmed_at timestamptz,
  expires_at  timestamptz default now() + interval '24 hours'
);

-- outcome_log table for Learning Loop L1
-- Every campaign action is logged here from Day 1
create table if not exists outcome_log (
  id              uuid primary key default gen_random_uuid(),
  merchant_id     uuid not null references merchants(id) on delete cascade,
  customer_id     uuid references customers(id),
  campaign_id     uuid references campaigns(id),
  action_type     text not null,  -- campaign_sent | link_clicked | order_placed | revenue_attributed
  channel         text,           -- email | sms | whatsapp
  trigger_type    text,           -- win_back | new_customer | vip_reward | birthday | cross_sell
  revenue_amount  numeric(10,2),  -- attributed revenue (if order placed after campaign)
  metadata        jsonb default '{}',
  created_at      timestamptz default now()
);

-- campaigns table: add trigger_type column
alter table campaigns
  add column if not exists trigger_type text;

-- merchants table: add industry column (for Yara's voice calibration)
alter table merchants
  add column if not exists industry text;
