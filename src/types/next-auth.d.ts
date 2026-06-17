import type { DefaultSession } from "next-auth"

/**
 * Augment NextAuth's Session type to include the user id.
 * `src/lib/auth.ts` injects `user.id` in the session callback; this makes the
 * type match so `session.user.id` is type-safe across the app.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }
}
