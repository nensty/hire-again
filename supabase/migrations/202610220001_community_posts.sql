-- Links to posts people chose to share publicly; not imported candidate profiles.
create table public.community_posts (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid default auth.uid() references auth.users(id) on delete cascade,
 url text not null unique check(length(url)<=2048 and url ~ '^https://((www\.)?linkedin\.com/(posts/|feed/update/|pulse/)|lnkd\.in/)[^[:space:]]+$'),
 title text not null default 'Shared LinkedIn post' check(length(trim(title)) between 1 and 140),
 author_name text check(length(author_name)<=100), role_label text check(length(role_label)<=120),
 function text check(function in ('Engineering','QA / Automation','DevOps / SRE','Product','Design','Data','Marketing','Sales','Customer Success','People / Operations','Finance / Legal','Other')),
 skills text[] not null default '{}' check(coalesce(array_ndims(skills),1)=1), kind text not null default 'community' check(kind in ('looking','hiring','community')),
 note text check(length(note)<=240), status text not null default 'active' check(status in ('active','hidden','closed')),
 expires_at timestamptz not null default(now()+interval '30 days'),closed_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create function public.validate_post() returns trigger language plpgsql set search_path='' as $$
begin
 if cardinality(new.skills)>5 or exists(select 1 from unnest(new.skills) s where s is null or length(trim(s)) not between 1 and 40) then raise exception 'Invalid skills';end if;
 if tg_op='INSERT' then new.created_at=now();new.expires_at=now()+interval '30 days';
 else
  if new.id<>old.id or new.owner_id is distinct from old.owner_id then raise exception 'Identity is immutable';end if;
  new.created_at=old.created_at;
  if new.expires_at is distinct from old.expires_at or (new.status='active' and old.status<>'active') then new.expires_at=now()+interval '30 days';end if;
 end if;
 if new.status='closed' then
  if tg_op='INSERT' then new.closed_at=now();else new.closed_at=coalesce(old.closed_at,now());end if;
 elsif new.status='active' or tg_op='INSERT' then new.closed_at=null;else new.closed_at=old.closed_at;end if;
 new.updated_at=now();return new;
end $$;
create trigger validate_community_post before insert or update on public.community_posts for each row execute function public.validate_post();
create index posts_owner_idx on public.community_posts(owner_id);
create index posts_status_expiry_idx on public.community_posts(status,expires_at);
create index posts_function_idx on public.community_posts(function);
create index posts_created_idx on public.community_posts(created_at desc);
alter table public.community_posts enable row level security;
create policy public_posts on public.community_posts for select to anon,authenticated using(status='active' and expires_at>now());
create policy own_posts on public.community_posts for select to authenticated using(owner_id=(select auth.uid()));
create policy insert_post on public.community_posts for insert to authenticated with check(owner_id=(select auth.uid()));
create policy update_post on public.community_posts for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy delete_post on public.community_posts for delete to authenticated using(owner_id=(select auth.uid()));
grant select on public.community_posts to anon;
grant select,insert,update,delete on public.community_posts to authenticated;
grant all on public.community_posts to service_role;
alter table public.reports drop constraint reports_entity_type_check;
alter table public.reports add constraint reports_entity_type_check check(entity_type in ('candidate','role','post'));
-- Exact link supplied by the organizer. No authors, roles, post dates, or comments were inferred.
insert into public.community_posts(id,owner_id,url,title,kind,note) values(
 'ba538e0c-1f62-4ec3-91c5-b29e9aa9eb96',null,'https://lnkd.in/p/dc8K-GpP','Shared LinkedIn discussion','community',
 'A discussion shared by the community organizer. Open the original thread and comments on LinkedIn.'
) on conflict do nothing;
create or replace function public.retention_cleanup() returns void language plpgsql security definer set search_path='' as $$
begin
 delete from public.candidate_profiles where (status='closed' and closed_at<now()-interval '30 days') or (status<>'closed' and expires_at<now()-interval '30 days');
 delete from public.hiring_roles where (status='closed' and closed_at<now()-interval '30 days') or (status<>'closed' and expires_at<now()-interval '30 days');
 delete from public.community_posts where (status='closed' and closed_at<now()-interval '30 days') or (status<>'closed' and expires_at<now()-interval '30 days');
 delete from public.reports where created_at<now()-interval '30 days' or not exists(select 1 from public.candidate_profiles c where reports.entity_type='candidate' and c.id=reports.entity_id) and not exists(select 1 from public.hiring_roles r where reports.entity_type='role' and r.id=reports.entity_id) and not exists(select 1 from public.community_posts p where reports.entity_type='post' and p.id=reports.entity_id);
 delete from public.action_limits where window_start<now()-interval '1 day';
 delete from public.reminder_deliveries d where not exists(select 1 from public.candidate_profiles c where d.entity_type='candidate' and c.id=d.entity_id) and not exists(select 1 from public.hiring_roles r where d.entity_type='role' and r.id=d.entity_id) or listing_expires_at<now()-interval '30 days';
end $$;
revoke all on function public.retention_cleanup() from public,anon,authenticated;
grant execute on function public.retention_cleanup() to service_role;
