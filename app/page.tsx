"use client"

import { useState, useEffect } from "react"
import { CreateScreen } from "@/components/coffeemon/create-screen"
import { CoffeemonView } from "@/components/coffeemon/coffeemon-view"
import type { CoffeemonData } from "@/lib/coffeemon-types"

const STORAGE_KEY = "coffeemon-data"

function loadData(): CoffeemonData | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CoffeemonData
  } catch {
    return null
  }
}

function saveData(data: CoffeemonData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function clearData() {
  localStorage.removeItem(STORAGE_KEY)
}

export default function Page() {
  const [coffeemon, setCoffeemon] = useState<CoffeemonData | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const saved = loadData()
    if (saved) setCoffeemon(saved)
    setLoaded(true)
  }, [])

  function handleCreate(data: CoffeemonData) {
    saveData(data)
    setCoffeemon(data)
  }

  function handleUpdate(data: CoffeemonData) {
    saveData(data)
    setCoffeemon(data)
  }

  function handleReset() {
    clearData()
    setCoffeemon(null)
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
    return <CreateScreen onCreate={handleCreate} />
  }

  return (
    <CoffeemonView data={coffeemon} onUpdate={handleUpdate} onReset={handleReset} />
  )
}
