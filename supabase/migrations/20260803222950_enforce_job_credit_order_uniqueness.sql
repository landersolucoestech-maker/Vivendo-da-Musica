begin;

alter table public.company_credit_lots
  drop constraint if exists company_credit_lots_source_order_key;

alter table public.company_credit_lots
  add constraint company_credit_lots_source_order_key unique (source_order_id);

commit;
