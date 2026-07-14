create policy "Staff moderates community posts"
  on public.community_posts for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "Staff moderates community comments"
  on public.community_comments for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "Staff moderates community groups"
  on public.community_groups for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

grant update on table public.community_posts, public.community_comments to authenticated;

alter function public.moderate_community_report(uuid, text, text) security invoker;
