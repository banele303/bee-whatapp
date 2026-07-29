"use client"

import { LiveblocksProvider as Provider } from "@liveblocks/react"
import { ReactNode } from "react"

export function LiveblocksProvider({ children }: { children: ReactNode }) {
  // Normally you would pass publicApiKey or authEndpoint here.
  // For local development without actual Liveblocks backend, we can just use a dummy key
  // or point to an API route that handles auth.
  return (
    <Provider authEndpoint="/api/liveblocks-auth">
      {children}
    </Provider>
  )
}
