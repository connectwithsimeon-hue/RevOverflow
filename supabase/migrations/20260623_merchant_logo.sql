-- Merchant-uploaded logo, used to brand their printed counter card / window
-- sticker (lib/decal-design.ts embeds the actual uploaded image — never a
-- redrawn/recreated version). NULL means the merchant hasn't uploaded one
-- yet, in which case the design falls back to RevOverflow's own icon + logo.
alter table merchants add column if not exists logo_url text;
