import { DefaultSession } from "next-auth"
import { handlers } from "@/app/lib/auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }
}

export const { GET, POST } = handlers