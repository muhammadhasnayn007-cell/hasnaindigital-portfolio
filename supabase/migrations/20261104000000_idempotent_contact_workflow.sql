alter table public.project_inquiries
  add column if not exists submission_key text;

create unique index if not exists project_inquiries_submission_key_uidx
  on public.project_inquiries (submission_key)
  where submission_key is not null;

do $$
begin
  if exists (
    select 1
    from public.notification_deliveries
    group by inquiry_id, delivery_type
    having count(*) > 1
  ) then
    raise exception 'Duplicate notification deliveries exist; reconcile them before applying idempotency migration';
  end if;
end;
$$;

create unique index if not exists notification_deliveries_inquiry_type_uidx
  on public.notification_deliveries (inquiry_id, delivery_type);

create or replace function public.claim_notification_delivery(delivery_id uuid)
returns table (
  id uuid,
  inquiry_id uuid,
  status text,
  attempt_count integer,
  provider_id text,
  delivered_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  update public.notification_deliveries
  set status = 'sending',
      attempt_count = public.notification_deliveries.attempt_count + 1,
      last_error = null,
      updated_at = now()
  where public.notification_deliveries.id = claim_notification_delivery.delivery_id
    and (
      public.notification_deliveries.status in ('pending', 'failed')
      or (
        public.notification_deliveries.status = 'sending'
        and public.notification_deliveries.updated_at < now() - interval '10 minutes'
      )
    )
  returning
    public.notification_deliveries.id,
    public.notification_deliveries.inquiry_id,
    public.notification_deliveries.status,
    public.notification_deliveries.attempt_count,
    public.notification_deliveries.provider_id,
    public.notification_deliveries.delivered_at;
$$;

revoke all on function public.claim_notification_delivery(uuid) from public;
grant execute on function public.claim_notification_delivery(uuid) to service_role;
