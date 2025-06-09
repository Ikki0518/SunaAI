import { DefaultSession } from "next-auth"
import { GET, POST } from "@/app/lib/auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }
}

export { GET, POST }