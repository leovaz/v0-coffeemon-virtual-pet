import type { UserData, CoffeemonData, ChatMessage, CoffeemonMemory, HistoryEntry } from "./coffeemon-types"

const INITIAL_COINS = 100
const MAX_HISTORY = 10
const MAX_MESSAGES = 20
const MAX_MEMORIES = 10

function getKey(email: string | null): string {
  if (!email) return "coffeemon_guest"
  return `coffeemon_${email}`
}

export function loadUserData(email: string | null): UserData {
  if (typeof window === "undefined") {
    return { coffeemon: null, coins: INITIAL_COINS, history: [], chat: [], memories: [] }
  }

  const key = getKey(email)
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw) as UserData
      return {
        coffeemon: parsed.coffeemon ?? null,
        coins: parsed.coins ?? INITIAL_COINS,
        history: parsed.history ?? [],
        chat: parsed.chat ?? [],
        memories: parsed.memories ?? [],
      }
    }
  } catch {
    // ignore parse errors
  }

  // If logged in but no data, also check guest data to migrate
  if (email) {
    try {
      const guestRaw = localStorage.getItem("coffeemon_guest")
      if (guestRaw) {
        const guestData = JSON.parse(guestRaw) as UserData
        // Migrate guest data to user
        const migrated: UserData = {
          coffeemon: guestData.coffeemon ?? null,
          coins: guestData.coins ?? INITIAL_COINS,
          history: guestData.history ?? [],
          chat: guestData.chat ?? [],
          memories: guestData.memories ?? [],
        }
        saveUserData(email, migrated)
        // Clear guest data after migration
        localStorage.removeItem("coffeemon_guest")
        return migrated
      }
    } catch {
      // ignore
    }
  }

  return { coffeemon: null, coins: INITIAL_COINS, history: [], chat: [], memories: [] }
}

export function saveUserData(email: string | null, data: UserData) {
  if (typeof window === "undefined") return
  const key = getKey(email)
  const trimmed: UserData = {
    ...data,
    history: data.history.slice(-MAX_HISTORY),
    chat: data.chat.slice(-MAX_MESSAGES),
    memories: data.memories.slice(-MAX_MEMORIES),
  }
  localStorage.setItem(key, JSON.stringify(trimmed))
}

export function clearUserData(email: string | null) {
  if (typeof window === "undefined") return
  const key = getKey(email)
  localStorage.removeItem(key)
  // Also clear legacy keys
  localStorage.removeItem("coffeemon-data")
  localStorage.removeItem("coffeemon-chat")
  localStorage.removeItem("coffeemon-memories")
}

export function updateCoffeemon(email: string | null, coffeemon: CoffeemonData) {
  const data = loadUserData(email)
  data.coffeemon = coffeemon
  saveUserData(email, data)
}

export function updateCoins(email: string | null, amount: number): number {
  const data = loadUserData(email)
  data.coins = Math.max(0, data.coins + amount)
  saveUserData(email, data)
  return data.coins
}

export function addHistoryEntry(email: string | null, action: string, coins: number) {
  const data = loadUserData(email)
  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    action,
    coins,
    timestamp: new Date().toISOString(),
  }
  data.history = [...data.history, entry].slice(-MAX_HISTORY)
  saveUserData(email, data)
}

export function updateChat(email: string | null, messages: ChatMessage[]) {
  const data = loadUserData(email)
  data.chat = messages.slice(-MAX_MESSAGES)
  saveUserData(email, data)
}

export function updateMemories(email: string | null, memories: CoffeemonMemory[]) {
  const data = loadUserData(email)
  data.memories = memories.slice(-MAX_MEMORIES)
  saveUserData(email, data)
}
