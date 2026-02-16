"use client"

import { createContext, useContext } from "react"

export interface PrivySafeState {
  ready: boolean
  authenticated: boolean
  user: { email?: { address: string } } | null
  login: () => void
  logout: () => Promise<void>
}

const fallback: PrivySafeState = {
  ready: true,
  authenticated: false,
  user: null,
  login: () => {},
  logout: async () => {},
}

export const PrivySafeContext = createContext<PrivySafeState>(fallback)

export function usePrivySafe(): PrivySafeState {
  return useContext(PrivySafeContext)
}
