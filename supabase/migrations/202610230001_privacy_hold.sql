-- Privacy review hold. Non-destructive: preserve records for owner removal,
-- but stop public reads and all new client inserts, including direct REST calls.
-- Restrictive policies AND with the existing permissive owner/public policies.
-- Service-role access remains available to authorized operators and cleanup.
-- Hide existing active rows as well: a future policy change must not
-- automatically republish earlier entries or restart their reminders.
update public.candidate_profiles set status='hidden' where status='active';
update public.hiring_roles set status='hidden' where status='active';
update public.community_posts set status='hidden' where status='active';
do $$
declare tbl text;
begin
 foreach tbl in array array['candidate_profiles','hiring_roles','community_posts'] loop
  execute format('create policy privacy_hold_reads on public.%I as restrictive for select to anon,authenticated using (owner_id=(select auth.uid()))',tbl);
  execute format('create policy privacy_hold_inserts on public.%I as restrictive for insert to anon,authenticated with check (false)',tbl);
  execute format('create policy privacy_hold_updates on public.%I as restrictive for update to anon,authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()) and status in (''hidden'',''closed''))',tbl);
 end loop;
end $$;
