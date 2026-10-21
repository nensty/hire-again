-- Apply with Supabase migrations. No public email addresses or privileged credentials.
create table public.candidate_profiles (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug)<=90),
 full_name text not null check(length(trim(full_name)) between 1 and 100),
 linkedin_url text not null check(linkedin_url ~ '^https://(www\.)?linkedin\.com/[^[:space:]]*$'),
 pandadoc_role text check(length(pandadoc_role)<=120), target_role text not null check(length(trim(target_role)) between 1 and 120),
 function text not null, seniority text not null, location text not null check(length(trim(location)) between 1 and 120),
 regions text[] not null, work_modes text[] not null, skills text[] not null,
 relocation boolean, open_to_work_post_url text check(open_to_work_post_url ~ '^https://(www\.)?linkedin\.com/[^[:space:]]*$'),
 note text check(length(note)<=240), status text not null default 'active' check(status in ('active','hidden','closed')),
 expires_at timestamptz not null default (now()+interval '30 days'), reminder_sent_at timestamptz,
 closed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(owner_id)
);
create table public.hiring_roles (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug)<=90),
 company_name text not null check(length(trim(company_name)) between 1 and 100), company_website text check(company_website ~ '^https://[^[:space:]]+$'),
 contact_name text not null check(length(trim(contact_name)) between 1 and 100),
 contact_linkedin_url text check(contact_linkedin_url ~ '^https://(www\.)?linkedin\.com/[^[:space:]]*$'),
 role_title text not null check(length(trim(role_title)) between 1 and 120),
 function text not null, seniority text not null, location text not null check(length(trim(location)) between 1 and 120),
 regions text[] not null, work_modes text[] not null, skills text[] not null,
 visa_support text check(length(visa_support)<=160), vacancy_url text not null check(vacancy_url ~ '^https://[^[:space:]]+$'),
 hiring_post_url text check(hiring_post_url ~ '^https://(www\.)?linkedin\.com/[^[:space:]]*$'),
 note text check(length(note)<=240), status text not null default 'active' check(status in ('active','hidden','closed')),
 expires_at timestamptz not null default (now()+interval '30 days'), reminder_sent_at timestamptz,
 closed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- Shared database validation also protects writes made directly through the API.
create function public.validate_listing() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.function <> all(array['Engineering','QA / Automation','DevOps / SRE','Product','Design','Data','Marketing','Sales','Customer Success','People / Operations','Finance / Legal','Other']) then raise exception 'Invalid function'; end if;
 if new.seniority <> all(array['Junior','Mid-level','Senior','Lead','Staff / Principal','Manager','Director+','Flexible']) then raise exception 'Invalid seniority'; end if;
 if cardinality(new.regions) not between 1 and 8 or array_position(new.regions,null) is not null or not new.regions <@ array['Worldwide','Europe','EU / EEA','UK','US / Canada','Latin America','APAC','Other'] then raise exception 'Invalid regions'; end if;
 if cardinality(new.work_modes) not between 1 and 4 or array_position(new.work_modes,null) is not null or not new.work_modes <@ array['Remote','Hybrid','On-site','Flexible'] then raise exception 'Invalid work modes'; end if;
 if cardinality(new.skills) not between 1 and 10 or exists(select 1 from unnest(new.skills) s where s is null or length(trim(s)) not between 1 and 40) then raise exception 'Invalid skills'; end if;
 if tg_op='INSERT' then
   new.created_at=now(); new.expires_at=now()+interval '30 days'; new.reminder_sent_at=null;
 else
   if new.owner_id<>old.owner_id or new.id<>old.id or new.slug<>old.slug then raise exception 'Identity is immutable'; end if;
   new.created_at=old.created_at;
   if new.expires_at is distinct from old.expires_at or (new.status='active' and old.status<>'active') then
     new.expires_at=now()+interval '30 days'; new.reminder_sent_at=null;
   elsif coalesce(auth.role(),'')<>'service_role' then new.reminder_sent_at=old.reminder_sent_at;
   end if;
 end if;
 if new.status='closed' then
   if tg_op='INSERT' then new.closed_at=now(); else new.closed_at=coalesce(old.closed_at,now()); end if;
 elsif new.status='active' then new.closed_at=null;
 elsif tg_op='INSERT' then new.closed_at=null;
 else new.closed_at=old.closed_at;
 end if;
 new.updated_at=now();return new;
end $$;
create trigger validate_candidate before insert or update on public.candidate_profiles for each row execute function public.validate_listing();
create trigger validate_role before insert or update on public.hiring_roles for each row execute function public.validate_listing();
create index candidates_status_idx on public.candidate_profiles(status);
create index candidates_expiry_idx on public.candidate_profiles(expires_at);
create index candidates_function_idx on public.candidate_profiles(function);
create index candidates_seniority_idx on public.candidate_profiles(seniority);
create index roles_owner_idx on public.hiring_roles(owner_id);
create index roles_status_idx on public.hiring_roles(status);
create index roles_expiry_idx on public.hiring_roles(expires_at);
create index roles_function_idx on public.hiring_roles(function);
create index roles_seniority_idx on public.hiring_roles(seniority);
alter table public.candidate_profiles enable row level security;
alter table public.hiring_roles enable row level security;
create policy public_candidates on public.candidate_profiles for select to anon,authenticated using(status='active' and expires_at>now());
create policy own_candidates on public.candidate_profiles for select to authenticated using(owner_id=(select auth.uid()));
create policy insert_candidate on public.candidate_profiles for insert to authenticated with check(owner_id=(select auth.uid()));
create policy update_candidate on public.candidate_profiles for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy delete_candidate on public.candidate_profiles for delete to authenticated using(owner_id=(select auth.uid()));
create policy public_roles on public.hiring_roles for select to anon,authenticated using(status='active' and expires_at>now());
create policy own_roles on public.hiring_roles for select to authenticated using(owner_id=(select auth.uid()));
create policy insert_role on public.hiring_roles for insert to authenticated with check(owner_id=(select auth.uid()));
create policy update_role on public.hiring_roles for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy delete_role on public.hiring_roles for delete to authenticated using(owner_id=(select auth.uid()));
grant select on public.candidate_profiles,public.hiring_roles to anon;
grant select,insert,update,delete on public.candidate_profiles,public.hiring_roles to authenticated;
grant all on public.candidate_profiles,public.hiring_roles to service_role;

create table public.reports (
 id uuid primary key default gen_random_uuid(), entity_type text not null check(entity_type in ('candidate','role')),
 entity_id uuid not null, reason text not null check(reason in ('Outdated or filled','Misleading information','Spam or scam','Privacy concern','Other')),
 created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
revoke all on public.reports from anon,authenticated;
grant all on public.reports to service_role;
create index reports_created_idx on public.reports(created_at);
-- Only one report per listing/reason/day bucket via the server is needed; retain no reporter email/IP.
create table public.action_limits (fingerprint text not null, action text not null, window_start timestamptz not null, hits integer not null default 1, primary key(fingerprint,action,window_start));
alter table public.action_limits enable row level security;
revoke all on public.action_limits from anon,authenticated;
create function public.consume_limit(p_fingerprint text,p_action text,p_max integer) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 insert into public.action_limits(fingerprint,action,window_start) values(p_fingerprint,p_action,date_trunc('hour',now()))
 on conflict(fingerprint,action,window_start) do update set hits=public.action_limits.hits+1 returning hits into n;
 return n<=p_max;
end $$;
revoke all on function public.consume_limit(text,text,integer) from public,anon,authenticated;
grant execute on function public.consume_limit(text,text,integer) to service_role;

create table public.reminder_deliveries (
 id uuid primary key default gen_random_uuid(), entity_type text not null check(entity_type in ('candidate','role')),entity_id uuid not null,
 listing_expires_at timestamptz not null, sent_at timestamptz, lease_until timestamptz, attempts integer not null default 0,
 unique(entity_type,entity_id,listing_expires_at)
);
alter table public.reminder_deliveries enable row level security;
revoke all on public.reminder_deliveries from anon,authenticated;
grant all on public.reminder_deliveries,public.action_limits to service_role;
-- Transactional claims make overlapping cron invocations safe; Resend uses each delivery ID as its idempotency key.
create function public.claim_reminders(p_limit integer default 100) returns table(delivery_id uuid,entity_type text,entity_id uuid,listing_expires_at timestamptz,email text,title text) language plpgsql security definer set search_path='' as $$
begin
 insert into public.reminder_deliveries(entity_type,entity_id,listing_expires_at)
 select 'candidate',c.id,c.expires_at from public.candidate_profiles c where c.status='active' and c.expires_at>now() and c.expires_at<=now()+interval '5 days' and c.reminder_sent_at is null
 union all select 'role',r.id,r.expires_at from public.hiring_roles r where r.status='active' and r.expires_at>now() and r.expires_at<=now()+interval '5 days' and r.reminder_sent_at is null
 on conflict do nothing;
 return query
 with claimed as (
 select d.id from public.reminder_deliveries d where d.sent_at is null and (d.lease_until is null or d.lease_until<now()) and (
 exists(select 1 from public.candidate_profiles c where d.entity_type='candidate' and c.id=d.entity_id and c.expires_at=d.listing_expires_at and c.status='active' and c.expires_at>now()) or
 exists(select 1 from public.hiring_roles r where d.entity_type='role' and r.id=d.entity_id and r.expires_at=d.listing_expires_at and r.status='active' and r.expires_at>now()))
 order by d.listing_expires_at for update skip locked limit least(p_limit,200)
 ), leased as (
 update public.reminder_deliveries d set lease_until=now()+interval '15 minutes', attempts=attempts+1 from claimed where d.id=claimed.id returning d.*
 )
 select d.id,d.entity_type,d.entity_id,d.listing_expires_at,u.email::text,coalesce(c.target_role,r.role_title)::text
 from leased d left join public.candidate_profiles c on d.entity_type='candidate' and c.id=d.entity_id
 left join public.hiring_roles r on d.entity_type='role' and r.id=d.entity_id
 join auth.users u on u.id=coalesce(c.owner_id,r.owner_id);
end $$;
create function public.complete_reminder(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare d public.reminder_deliveries;
begin
 update public.reminder_deliveries set sent_at=now(),lease_until=null where id=p_id and sent_at is null returning * into d;
 if d.id is null then return; end if;
 if d.entity_type='candidate' then update public.candidate_profiles set reminder_sent_at=now() where id=d.entity_id and expires_at=d.listing_expires_at;
 else update public.hiring_roles set reminder_sent_at=now() where id=d.entity_id and expires_at=d.listing_expires_at;end if;
end $$;
create function public.retention_cleanup() returns void language plpgsql security definer set search_path='' as $$
begin
 delete from public.candidate_profiles where (status='closed' and closed_at<now()-interval '30 days') or (status<>'closed' and expires_at<now()-interval '30 days');
 delete from public.hiring_roles where (status='closed' and closed_at<now()-interval '30 days') or (status<>'closed' and expires_at<now()-interval '30 days');
 delete from public.reports where created_at<now()-interval '30 days' or not exists(select 1 from public.candidate_profiles c where reports.entity_type='candidate' and c.id=reports.entity_id) and not exists(select 1 from public.hiring_roles r where reports.entity_type='role' and r.id=reports.entity_id);
 delete from public.action_limits where window_start<now()-interval '1 day';
 delete from public.reminder_deliveries d where not exists(select 1 from public.candidate_profiles c where d.entity_type='candidate' and c.id=d.entity_id) and not exists(select 1 from public.hiring_roles r where d.entity_type='role' and r.id=d.entity_id) or listing_expires_at<now()-interval '30 days';
end $$;
revoke all on function public.claim_reminders(integer),public.complete_reminder(uuid),public.retention_cleanup() from public,anon,authenticated;
grant execute on function public.claim_reminders(integer),public.complete_reminder(uuid),public.retention_cleanup() to service_role;
