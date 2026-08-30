-- 049: 알림·표시 언어 선호 (기기/계정)
alter table public.profiles
  add column if not exists preferred_locale text not null default 'ko'
  check (preferred_locale in ('ko', 'en'));

alter table public.push_tokens
  add column if not exists locale text not null default 'ko'
  check (locale in ('ko', 'en'));
