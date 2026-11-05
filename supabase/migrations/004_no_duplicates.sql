-- Each new-order form carries a one-time key, so a double tap can never create two orders.
alter table public.orders add column if not exists client_key text unique;
