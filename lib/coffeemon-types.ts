export type CoffeemonType = "arabica" | "robusta" | "geisha"

export interface CoffeemonData {
  name: string
  type: CoffeemonType
  hydration: number
  energy: number
  quality: number
  createdAt: string
}
