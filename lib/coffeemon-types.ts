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
