import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      authorization: {
        params: {
          scope: "read:user user:email public_repo",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})

/**
 * Returns the authenticated user id, or null if not logged in.
 * Used as a guard at the top of API routes / server actions that act on
 * behalf of a user (triggering DeepSeek analysis, mutating favorites, etc.).
 */
export async function requireUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}
