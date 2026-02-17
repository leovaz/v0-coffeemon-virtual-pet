export type CoffeemonType = "arabica" | "robusta" | "geisha"

export interface CoffeemonData {
  name: string
  type: CoffeemonType
  hydration: number
  energy: number
  quality: number
  createdAt: string
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface CoffeemonMemory {
  id: string
  content: string
  createdAt: string
}

export interface HistoryEntry {
  id: string
  action: string
  coins: number // positive = earned, negative = spent
  timestamp: string
}

export type TrainingCategory = "preparacion" | "latte-art" | "proyecto" | "conocimiento"

export interface TrainingEntry {
  score: number
  category: TrainingCategory
  timestamp: string
}

export interface TrainingData {
  totalPoints: number
  stage: number // 1, 2, or 3
  trainingHistory: TrainingEntry[]
}

export interface UserData {
  coffeemon: CoffeemonData | null
  coins: number
  history: HistoryEntry[]
  chat: ChatMessage[]
  memories: CoffeemonMemory[]
  training: TrainingData
}
