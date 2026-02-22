"use client"

import { useEffect, useRef, useCallback } from "react"
import type { CoffeemonData, TrainingData } from "@/lib/coffeemon-types"

const HUB_API = "https://regenmon-final.vercel.app/api"
const SYNC_INTERVAL_MS = 5 * 60 * 1000

interface UseHubSyncOptions {
  data: CoffeemonData
  training: TrainingData
  coins: number
  onCoinsChange: (amount: number) => void
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 1): Promise<Response> {
  try {
    const res = await fetch(url, options)
    return res
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 2000))
      return fetchWithRetry(url, options, retries - 1)
    }
    throw err
  }
}

export function useHubSync({ data, training, coins, onCoinsChange }: UseHubSyncOptions) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const syncToHub = useCallback(async () => {
    if (typeof window === "undefined") return
    const hubId = localStorage.getItem("hubCoffeemonId")
    const isRegistered = localStorage.getItem("isRegisteredInHub")
    if (!hubId || isRegistered !== "true") return

    try {
      const res = await fetchWithRetry(`${HUB_API}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regenmonId: hubId,
          stats: {
            felicidad: data.hydration,
            energia: data.energy,
            hambre: data.quality,
          },
          totalPoints: training.totalPoints,
          trainingHistory: [],
        }),
      })
      if (res.ok) {
        const json = await res.json()
        if (json?.data?.balance !== undefined) {
          const diff = json.data.balance - coins
          if (diff !== 0) onCoinsChange(diff)
        }
      }
    } catch {
      // silent fail
    }
  }, [data, training, coins, onCoinsChange])

  // Periodic sync every 5 minutes
  useEffect(() => {
    if (typeof window === "undefined") return
    const isRegistered = localStorage.getItem("isRegisteredInHub")
    if (isRegistered !== "true") return

    syncToHub()
    intervalRef.current = setInterval(syncToHub, SYNC_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [syncToHub])

  return { syncToHub }
}
