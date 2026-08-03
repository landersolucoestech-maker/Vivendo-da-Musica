begin;

select plan(25);

select is(
  (
    select count(*)
    from public.course_certificates as certificate
    where not exists (
      select 1
      from public.enrollments as enrollment
      where enrollment.user_id = certificate.user_id
        and enrollment.course_id = certificate.course_id
        and enrollment.status = 'active'
    )
  ),
  0::bigint,
  'every certificate belongs to an active course enrollment'
);

select is(
  (
    select count(*)
    from public.lesson_progress as progress
    join public.lessons as lesson on lesson.id = progress.lesson_id
    join public.course_modules as module on module.id = lesson.module_id
    where not exists (
      select 1
      from public.enrollments as enrollment
      where enrollment.user_id = progress.user_id
        and enrollment.course_id = module.course_id
        and enrollment.status = 'active'
    )
  ),
  0::bigint,
  'lesson progress belongs to an actively enrolled student'
);

select is(
  (select count(*) from public.lesson_progress where completed and progress_percentage < 100),
  0::bigint,
  'completed lessons have one hundred percent progress'
);

select is(
  (select count(*) from public.lesson_progress where not completed and progress_percentage = 100),
  0::bigint,
  'incomplete lessons do not report one hundred percent progress'
);

select is(
  (select count(*) from public.lesson_progress where progress_percentage < 0 or progress_percentage > 100),
  0::bigint,
  'lesson progress percentage remains within its valid range'
);

select is(
  (select count(*) from public.lesson_progress where watched_seconds < 0),
  0::bigint,
  'lesson watch time is never negative'
);

select is(
  (
    select count(*)
    from public.company_profiles as company
    where not exists (
      select 1
      from public.company_members as member
      where member.company_id = company.id
        and member.user_id = company.owner_user_id
        and member.member_role = 'owner'
        and member.status = 'active'
    )
  ),
  0::bigint,
  'every company profile has an active owner membership'
);

select is(
  (
    select count(*)
    from public.opportunities as opportunity
    where opportunity.company_id is not null
      and opportunity.created_by is not null
      and not exists (
        select 1
        from public.company_members as member
        where member.company_id = opportunity.company_id
          and member.user_id = opportunity.created_by
          and member.status = 'active'
      )
  ),
  0::bigint,
  'company opportunities are created by active company members'
);

select is(
  (
    select count(*)
    from public.opportunity_applications as application
    join public.opportunities as opportunity on opportunity.id = application.opportunity_id
    where opportunity.company_id is not null
      and not exists (
        select 1
        from public.candidate_profiles as candidate
        where candidate.user_id = application.applicant_id
      )
  ),
  0::bigint,
  'applicants to company opportunities have candidate profiles'
);

select is(
  (
    select count(*)
    from public.opportunity_application_messages as message
    join public.opportunity_applications as application on application.id = message.application_id
    join public.opportunities as opportunity on opportunity.id = application.opportunity_id
    where message.sender_id <> application.applicant_id
      and not exists (
        select 1
        from public.company_members as member
        where member.company_id = opportunity.company_id
          and member.user_id = message.sender_id
          and member.status = 'active'
      )
  ),
  0::bigint,
  'application messages are sent only by process participants'
);

select is(
  (
    select count(*)
    from public.opportunity_application_messages as message
    join public.opportunity_applications as application on application.id = message.application_id
    where message.sender_id = application.applicant_id
      and message.sender_type <> 'candidate'
  ),
  0::bigint,
  'candidate messages use the candidate sender type'
);

select is(
  (
    select count(*)
    from public.opportunity_application_messages as message
    join public.opportunity_applications as application on application.id = message.application_id
    join public.opportunities as opportunity on opportunity.id = application.opportunity_id
    where exists (
      select 1
      from public.company_members as member
      where member.company_id = opportunity.company_id
        and member.user_id = message.sender_id
        and member.status = 'active'
    )
      and message.sender_type <> 'company'
  ),
  0::bigint,
  'company messages use the company sender type'
);

select is(
  (
    select count(*)
    from public.affiliate_conversions as conversion
    join public.affiliate_links as link on link.id = conversion.affiliate_link_id
    where conversion.affiliate_id <> link.affiliate_id
  ),
  0::bigint,
  'affiliate conversions belong to the owner of the referral link'
);

select is(
  (
    select count(*)
    from public.affiliate_commissions as commission
    join public.affiliate_conversions as conversion on conversion.id = commission.conversion_id
    where commission.affiliate_id <> conversion.affiliate_id
  ),
  0::bigint,
  'affiliate commissions belong to the conversion affiliate'
);

select is(
  (
    select count(*)
    from public.affiliate_commissions as commission
    join public.affiliate_conversions as conversion on conversion.id = commission.conversion_id
    where commission.amount_cents <> conversion.commission_amount_cents
  ),
  0::bigint,
  'affiliate commission values match their conversion values'
);

select is(
  (
    select count(*)
    from public.affiliate_conversions as conversion
    where conversion.status = 'approved'
      and not exists (
        select 1
        from public.affiliate_commissions as commission
        where commission.conversion_id = conversion.id
      )
  ),
  0::bigint,
  'approved affiliate conversions have commission records'
);

select is(
  (select count(*) from public.affiliate_commissions where status = 'available' and available_at is null),
  0::bigint,
  'available affiliate commissions have availability timestamps'
);

select is(
  (
    select count(*)
    from public.affiliate_withdrawals
    where status in ('paid', 'rejected', 'canceled')
      and processed_at is null
  ),
  0::bigint,
  'processed affiliate withdrawals have processing timestamps'
);

select is(
  (
    select count(*)
    from public.affiliate_withdrawals as withdrawal
    where not exists (
      select 1
      from public.affiliate_withdrawal_events as event
      where event.withdrawal_id = withdrawal.id
    )
  ),
  0::bigint,
  'affiliate withdrawals have audit event history'
);

select is(
  (
    select count(*)
    from public.affiliate_profiles
    where balance_cents < 0
       or lifetime_earnings_cents < 0
       or commission_rate < 0
       or commission_rate > 100
  ),
  0::bigint,
  'affiliate financial values remain valid and nonnegative'
);

select is(
  (
    select count(*)
    from public.producer_financial_accounts
    where eligible_balance_cents > current_balance_cents
  ),
  0::bigint,
  'producer eligible balance never exceeds current balance'
);

select is(
  (
    select count(*)
    from public.producer_financial_accounts
    where current_balance_cents < 0 or eligible_balance_cents < 0
  ),
  0::bigint,
  'producer balances remain nonnegative'
);

select is(
  (
    select count(*)
    from public.producer_payout_requests as request
    join public.producer_payout_methods as method on method.id = request.payout_method_id
    where request.producer_id <> method.producer_id
  ),
  0::bigint,
  'producer payout requests use a payout method owned by the producer'
);

select is(
  (
    select count(*)
    from public.producer_payout_requests
    where status in ('paid', 'rejected', 'canceled')
      and processed_at is null
  ),
  0::bigint,
  'processed producer payouts have processing timestamps'
);

select is(
  (
    select count(*)
    from public.producer_payout_requests as request
    where not exists (
      select 1
      from public.producer_payout_events as event
      where event.payout_request_id = request.id
    )
  ),
  0::bigint,
  'producer payout requests have audit event history'
);

select * from finish();
rollback;
