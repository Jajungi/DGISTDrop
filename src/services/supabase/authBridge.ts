import type { User } from '@/src/types';

type AfterAuth = (user: User | null) => Promise<void>;

let afterAuth: AfterAuth = async () => {};

export function bindAfterSupabaseAuth(fn: AfterAuth) {
  afterAuth = fn;
}

export function afterSupabaseAuth(user: User | null): Promise<void> {
  return afterAuth(user);
}
