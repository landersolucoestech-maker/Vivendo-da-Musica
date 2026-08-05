-- Split administrative ALL policies so read access has one authoritative
-- policy while preserving staff mutation capabilities.

drop policy if exists ledger_transactions_staff_manage on public.ledger_transactions;

create policy ledger_transactions_staff_insert
on public.ledger_transactions
for insert
to authenticated
with check (public.is_platform_staff());

create policy ledger_transactions_staff_update
on public.ledger_transactions
for update
to authenticated
using (public.is_platform_staff())
with check (public.is_platform_staff());

create policy ledger_transactions_staff_delete
on public.ledger_transactions
for delete
to authenticated
using (public.is_platform_staff());

drop policy if exists "Admins manage platform financial terms" on public.platform_financial_settings;

create policy platform_financial_settings_staff_insert
on public.platform_financial_settings
for insert
to authenticated
with check (public.is_platform_staff());

create policy platform_financial_settings_staff_update
on public.platform_financial_settings
for update
to authenticated
using (public.is_platform_staff())
with check (public.is_platform_staff());

create policy platform_financial_settings_staff_delete
on public.platform_financial_settings
for delete
to authenticated
using (public.is_platform_staff());
