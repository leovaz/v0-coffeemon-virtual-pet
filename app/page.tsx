"use client"

import { useState, useEffect, useCallback } from "react"
import { CreateScreen } from "@/components/coffeemon/create-screen"
import { CoffeemonView } from "@/components/coffeemon/coffeemon-view"
import { CoffeemonHeader } from "@/components/coffeemon/coffeemon-header"
import type { CoffeemonData, ChatMessage, CoffeemonMemory, TrainingData } from "@/lib/coffeemon-types"
import { usePrivySafe } from "@/lib/use-privy-safe"
import {
  loadUserData,
  saveUserData,
  clearUserData,
  addHistoryEntry,
} from "@/lib/user-storage"

export default function Page() {
  const privy = usePrivySafe()
  const userEmail: string | null = privy.authenticated
    ? privy.user?.email?.address ?? null
    : null

  const [coffeemon, setCoffeemon] = useState<CoffeemonData | null>(null)
  const [coins, setCoins] = useState(100)
  const [history, setHistory] = useState<{ id: string; action: string; coins: number; timestamp: string }[]>([])
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [memories, setMemories] = useState<CoffeemonMemory[]>([])
  const [training, setTraining] = useState<TrainingData>({ totalPoints: 0, stage: 1, trainingHistory: [] })
  const [loaded, setLoaded] = useState(false)

  // Load data when user changes or on mount
  useEffect(() => {
    if (!privy.ready) return
    const data = loadUserData(userEmail)
    setCoffeemon(data.coffeemon)
    setCoins(data.coins)
    setHistory(data.history)
    setChat(data.chat)
    setMemories(data.memories)
    setTraining(data.training ?? { totalPoints: 0, stage: 1, trainingHistory: [] })
    setLoaded(true)
  }, [userEmail, privy.ready])

  const persist = useCallback(
    (updates: Partial<{ coffeemon: CoffeemonData | null; coins: number; history: typeof history; chat: ChatMessage[]; memories: CoffeemonMemory[]; training: TrainingData }>) => {
      const currentData = loadUserData(userEmail)
      const merged = {
        coffeemon: updates.coffeemon !== undefined ? updates.coffeemon : currentData.coffeemon,
        coins: updates.coins !== undefined ? updates.coins : currentData.coins,
        history: updates.history !== undefined ? updates.history : currentData.history,
        chat: updates.chat !== undefined ? updates.chat : currentData.chat,
        memories: updates.memories !== undefined ? updates.memories : currentData.memories,
        training: updates.training !== undefined ? updates.training : currentData.training,
      }
      saveUserData(userEmail, merged)
    },
    [userEmail]
  )

  function handleCreate(data: CoffeemonData) {
    setCoffeemon(data)
    persist({ coffeemon: data })
    addHistoryEntry(userEmail, "Coffeemon creado", 0)
    // Reload history
    const reloaded = loadUserData(userEmail)
    setHistory(reloaded.history)
  }

  function handleUpdate(data: CoffeemonData) {
    setCoffeemon(data)
    persist({ coffeemon: data })
  }

  function handleCoinsChange(amount: number) {
    setCoins((prev) => {
      const next = Math.max(0, prev + amount)
      persist({ coins: next })
      return next
    })
  }

  function handleHistoryAdd(action: string, coinAmount: number) {
    addHistoryEntry(userEmail, action, coinAmount)
    const reloaded = loadUserData(userEmail)
    setHistory(reloaded.history)
  }

  function handleChatUpdate(msgs: ChatMessage[]) {
    setChat(msgs)
    persist({ chat: msgs })
  }

  function handleMemoriesUpdate(mems: CoffeemonMemory[]) {
    setMemories(mems)
    persist({ memories: mems })
  }

  function handleTrainingUpdate(t: TrainingData) {
    setTraining(t)
    persist({ training: t })
  }

  function handleReset() {
    clearUserData(userEmail)
    setCoffeemon(null)
    setCoins(100)
    setHistory([])
    setChat([])
    setMemories([])
    setTraining({ totalPoints: 0, stage: 1, trainingHistory: [] })
  }

  // Prevent flash while loading
  if (!loaded) {
    return (
      <div className="coffee-farm-bg min-h-screen flex items-center justify-center">
        <div className="nes-container is-rounded" style={{ backgroundColor: "#faf3e0" }}>
          <p className="text-center" style={{ fontSize: "0.7rem", color: "#2d1b0e" }}>
            {"Cargando..."}
          </p>
        </div>
      </div>
    )
  }

  if (!coffeemon) {
    return (
      <div className="coffee-farm-bg min-h-screen">
        <CoffeemonHeader coins={coins} />
        <CreateScreen onCreate={handleCreate} />
      </div>
    )
  }

  return (
    <CoffeemonView
      data={coffeemon}
      coins={coins}
      history={history}
      chat={chat}
      memories={memories}
      training={training}
      userEmail={userEmail}
      onUpdate={handleUpdate}
      onCoinsChange={handleCoinsChange}
      onHistoryAdd={handleHistoryAdd}
      onChatUpdate={handleChatUpdate}
      onMemoriesUpdate={handleMemoriesUpdate}
      onTrainingUpdate={handleTrainingUpdate}
      onReset={handleReset}
    />
  )
}
