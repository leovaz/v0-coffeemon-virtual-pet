"use client"

import { useState } from "react"
import type { CoffeemonData, CoffeemonType } from "@/lib/coffeemon-types"

const ORIGIN_OPTIONS: {
  type: CoffeemonType
  emoji: string
  name: string
  color: string
  desc1: string
  desc2: string
}[] = [
  {
    type: "arabica",
    emoji: "\u{1F331}",
    name: "Arabica",
    color: "#2d6a2e",
    desc1: "Balanceado",
    desc2: "Crecimiento estable",
  },
  {
    type: "robusta",
    emoji: "\u{1F30B}",
    name: "Robusta",
    color: "#6b2020",
    desc1: "Mas resistente",
    desc2: "Energia alta",
  },
  {
    type: "geisha",
    emoji: "\u{1F304}",
    name: "Geisha",
    color: "#5b2d7a",
    desc1: "Mas delicado",
    desc2: "Alta felicidad",
  },
]

interface CreateScreenProps {
  onCreate: (data: CoffeemonData) => void
}

export function CreateScreen({ onCreate }: CreateScreenProps) {
  const [name, setName] = useState("")
  const [selectedType, setSelectedType] = useState<CoffeemonType | null>(null)
  const [error, setError] = useState("")

  const isNameValid = /^[a-zA-Z0-9]{2,15}$/.test(name)
  const canCreate = isNameValid && selectedType !== null

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setName(val)
    if (val.length > 0 && !/^[a-zA-Z0-9]{2,15}$/.test(val)) {
      if (val.length < 2) {
        setError("Minimo 2 caracteres")
      } else if (val.length > 15) {
        setError("Maximo 15 caracteres")
      } else {
        setError("Solo letras y numeros")
      }
    } else {
      setError("")
    }
  }

  function handleCreate() {
    if (!canCreate || !selectedType) return
    const data: CoffeemonData = {
      name,
      type: selectedType,
      hydration: 50,
      energy: 50,
      quality: 50,
      createdAt: new Date().toISOString(),
    }
    onCreate(data)
  }

  return (
    <div className="coffee-farm-bg min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="nes-container is-rounded with-title" style={{ backgroundColor: "#faf3e0" }}>
          <p className="title" style={{ backgroundColor: "#faf3e0", color: "#2d1b0e" }}>
            {"Coffeemon"}
          </p>

          <div className="text-center mb-8">
            <h1 className="text-base md:text-xl mb-4" style={{ color: "#2d1b0e", lineHeight: 1.6 }}>
              {"Crea tu Coffeemon"}
            </h1>
            <p className="text-xs md:text-sm" style={{ color: "#5a4a3a", lineHeight: 2 }}>
              {"Adopta tu planta de cafe virtual y hazla crecer hasta su mejor version \u2615"}
            </p>
          </div>

          {/* Name input */}
          <div className="nes-field mb-6">
            <label htmlFor="name_field" style={{ color: "#2d1b0e", fontSize: "0.7rem" }}>
              {"Nombre de tu Coffeemon"}
            </label>
            <input
              type="text"
              id="name_field"
              className="nes-input"
              placeholder="Ej: Cafecito"
              value={name}
              onChange={handleNameChange}
              maxLength={15}
              style={{ fontSize: "0.75rem" }}
            />
            {error && (
              <p className="nes-text is-error mt-2" style={{ fontSize: "0.6rem" }}>
                {error}
              </p>
            )}
          </div>

          {/* Origin selection */}
          <div className="mb-6">
            <p className="mb-4" style={{ color: "#2d1b0e", fontSize: "0.7rem" }}>
              {"Elige el tipo de origen"}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ORIGIN_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  className={`nes-container is-rounded origin-card text-left ${
                    selectedType === option.type ? "selected" : ""
                  }`}
                  onClick={() => setSelectedType(option.type)}
                  style={{
                    backgroundColor:
                      selectedType === option.type ? option.color : "#fff8e7",
                    color: selectedType === option.type ? "#fff" : "#2d1b0e",
                    padding: "1rem",
                  }}
                  aria-pressed={selectedType === option.type}
                >
                  <div className="text-center">
                    <span className="text-2xl md:text-3xl block mb-2" role="img" aria-label={option.name}>
                      {option.emoji}
                    </span>
                    <span className="block text-xs font-bold mb-2">{option.name}</span>
                    <span className="block" style={{ fontSize: "0.55rem", lineHeight: 2 }}>
                      {option.desc1}
                    </span>
                    <span className="block" style={{ fontSize: "0.55rem", lineHeight: 2 }}>
                      {option.desc2}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Create button */}
          <div className="text-center">
            <button
              type="button"
              className={`nes-btn ${canCreate ? "is-success" : ""}`}
              disabled={!canCreate}
              onClick={handleCreate}
              style={{ fontSize: "0.75rem" }}
            >
              {"\u00A1Germinar!"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
