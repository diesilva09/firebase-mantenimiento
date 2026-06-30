"use client"

import { useEffect, useRef } from "react"

const LIVE_UPDATE_EVENT = "maintenance-hub:live-update"
const LIVE_UPDATE_CHANNEL = "maintenance-hub:live-update-channel"

type LiveUpdateEventDetail = {
  scopes?: string[]
}

interface UseLiveRefreshOptions {
  callback: () => Promise<void> | void
  enabled?: boolean
  intervalMs?: number
  scopes?: string[]
  immediate?: boolean
}

function scopesMatch(ownScopes: string[], eventScopes: string[]) {
  if (ownScopes.includes("all") || eventScopes.includes("all")) return true
  return ownScopes.some((scope) => eventScopes.includes(scope))
}

export function emitLiveUpdate(scopes: string[] = ["all"]) {
  if (typeof window === "undefined") return

  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(LIVE_UPDATE_CHANNEL)
    channel.postMessage({ scopes })
    channel.close()
  }

  window.dispatchEvent(
    new CustomEvent<LiveUpdateEventDetail>(LIVE_UPDATE_EVENT, {
      detail: { scopes },
    })
  )
}

export function useLiveRefresh({
  callback,
  enabled = true,
  intervalMs = 20000,
  scopes = ["all"],
  immediate = true,
}: UseLiveRefreshOptions) {
  const callbackRef = useRef(callback)
  const runningRef = useRef(false)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    let disposed = false
    const broadcastChannel =
      "BroadcastChannel" in window ? new BroadcastChannel(LIVE_UPDATE_CHANNEL) : null

    const runRefresh = async () => {
      if (disposed || runningRef.current) return
      if (document.visibilityState === "hidden") return

      runningRef.current = true
      try {
        await callbackRef.current()
      } finally {
        runningRef.current = false
      }
    }

    const handleFocus = () => {
      void runRefresh()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void runRefresh()
      }
    }

    const handleOnline = () => {
      void runRefresh()
    }

    const handleLiveUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<LiveUpdateEventDetail>
      const eventScopes = customEvent.detail?.scopes ?? ["all"]

      if (scopesMatch(scopes, eventScopes)) {
        void runRefresh()
      }
    }

    const handleBroadcastMessage = (event: MessageEvent<LiveUpdateEventDetail>) => {
      const eventScopes = event.data?.scopes ?? ["all"]

      if (scopesMatch(scopes, eventScopes)) {
        void runRefresh()
      }
    }

    if (immediate) {
      void runRefresh()
    }

    const intervalId = window.setInterval(() => {
      void runRefresh()
    }, intervalMs)

    window.addEventListener("focus", handleFocus)
    window.addEventListener("online", handleOnline)
    window.addEventListener(LIVE_UPDATE_EVENT, handleLiveUpdate as EventListener)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    broadcastChannel?.addEventListener("message", handleBroadcastMessage)

    return () => {
      disposed = true
      window.clearInterval(intervalId)
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("online", handleOnline)
      window.removeEventListener(LIVE_UPDATE_EVENT, handleLiveUpdate as EventListener)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      broadcastChannel?.removeEventListener("message", handleBroadcastMessage)
      broadcastChannel?.close()
    }
  }, [enabled, immediate, intervalMs, scopes])
}
