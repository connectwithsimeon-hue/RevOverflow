-- Reputation monitoring — tracks a merchant's Google rating + reviews over time
-- so Yara can flag rating drops and new negative reviews, and trigger recovery
-- + review-request campaigns.
--
-- Uses ONE RevOverflow Google Places API key (server-side). The merchant only
-- provides their Google Place ID — no per-merchant OAuth, no extra accounts.
-- "current vs previous" lets us detect changes between refreshes.

create table if not exists reputation (
  id                 uuid primary key default uuid_generate_v4(),
  merchant_id        uuid not null references merchants(id) on delete cascade,
  google_place_id    text,
  business_name      text,
  rating             numeric(2,1),          -- current overall rating, e.g. 4.6
  review_count       integer,               -- current total reviews
  prev_rating        numeric(2,1),          -- rating at the previous refresh
  prev_review_count  integer,               -- review count at the previous refresh
  recent_reviews     jsonb,                 -- [{author, rating, text, time}]
  last_checked_at    timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (merchant_id)
);

create index if not exists idx_reputation_merchant on reputation(merchant_id);

-- Row-level security — same merchant-isolation pattern as the rest of the schema.
alter table reputation enable row level security;
create policy reputation_isolation on reputation
  for all using (merchant_id in (select id from merchants where auth_user_id = auth.uid()));
