begin;

create unique index if not exists company_credit_lots_source_order_idx
on public.company_credit_lots (source_order_id)
where source_order_id is not null;

commit;
