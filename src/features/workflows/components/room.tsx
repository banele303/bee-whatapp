"use client";

import { ReactNode } from "react";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { Spinner } from "@/components/ui/spinner";

export function Room({
  roomId,
  children,
}: {
  roomId: string
  children: ReactNode
}) {
  const isLiveblocksConfigured = Boolean(
    process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY || process.env.LIVEBLOCKS_SECRET_KEY
  )

  if (!isLiveblocksConfigured) {
    return <>{children}</>
  }

  return (
    <LiveblocksProvider
      throttle={16}
      authEndpoint="/api/liveblocks/auth"
      resolveUsers={async ({ userIds }) => {
        try {
          const response = await fetch("/api/liveblocks/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userIds }),
          });

          if (!response.ok) {
            return undefined;
          }

          return await response.json();
        } catch {
          return undefined;
        }
      }}
    >
      <RoomProvider id={roomId}>
        <ClientSideSuspense
          fallback={
            <div className="flex min-h-svh items-center justify-center">
              <Spinner className="size-6 text-muted-foreground" />
            </div>
          }
        >
          {children}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}