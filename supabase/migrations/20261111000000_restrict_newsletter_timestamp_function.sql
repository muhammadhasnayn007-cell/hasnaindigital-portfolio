alter function public.set_newsletter_subscriber_updated_at() security invoker;

revoke execute on function public.set_newsletter_subscriber_updated_at()
  from public, anon, authenticated;

grant execute on function public.set_newsletter_subscriber_updated_at()
  to service_role;
