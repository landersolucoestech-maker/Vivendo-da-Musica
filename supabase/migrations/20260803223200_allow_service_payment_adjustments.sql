begin;

create or replace function public.service_record_payment_adjustment(
  target_order_id uuid,
  target_adjustment_type text,
  target_amount_cents bigint,
  target_provider_reference text,
  target_idempotency_key text,
  target_reason text,
  target_metadata jsonb default '{}'::jsonb
)
returns public.payment_adjustments
language plpgsql
security invoker
set search_path = public, app_private, pg_temp
as $$
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Acesso de serviço obrigatório.';
  end if;
  return app_private.record_payment_adjustment(
    target_order_id,
    target_adjustment_type,
    target_amount_cents,
    target_provider_reference,
    target_idempotency_key,
    target_reason,
    target_metadata
  );
end;
$$;

revoke all on function public.service_record_payment_adjustment(uuid, text, bigint, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.service_record_payment_adjustment(uuid, text, bigint, text, text, text, jsonb) to service_role;

commit;
