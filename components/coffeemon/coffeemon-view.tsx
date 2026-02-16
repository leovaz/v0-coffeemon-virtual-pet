"use client"

import { useState, useCallback } from "react"
import type { CoffeemonData } from "@/lib/coffeemon-types"
import { CoffeemonChat } from "@/components/coffeemon/coffeemon-chat"

const STAGE_EMOJIS = [
  { min: 0, emoji: "\u{1F331}", label: "Semilla" },
  { min: 25, emoji: "\u{1F33F}", label: "Planta" },
  { min: 50, emoji: "\u{1F352}", label: "Cerezo" },
  { min: 75, emoji: "\u2615", label: "Taza" },
]

const TYPE_CONFIG = {
  arabica: { bg: "type-bg-arabica", label: "Arabica" },
  robusta: { bg: "type-bg-robusta", label: "Robusta" },
  geisha: { bg: "type-bg-geisha", label: "Geisha" },
}

interface CoffeemonViewProps {
  data: CoffeemonData
  onUpdate: (data: CoffeemonData) => void
  onReset: () => void
}

export function CoffeemonView({ data, onUpdate, onReset }: CoffeemonViewProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [cooldowns, setCooldowns] = useState({
    water: false,
    sun: false,
    care: false,
  })

  const avgStats = (data.hydration + data.energy + data.quality) / 3
  const stage = [...STAGE_EMOJIS].reverse().find((s) => avgStats >= s.min) ?? STAGE_EMOJIS[0]
  const typeConfig = TYPE_CONFIG[data.type]

  const clamp = (val: number) => Math.max(0, Math.min(100, val))

  const handleAction = useCallback(
    (action: "water" | "sun" | "care") => {
      if (cooldowns[action]) return

      const updated = { ...data }
      switch (action) {
        case "water":
          updated.hydration = clamp(data.hydration + 5)
          updated.energy = clamp(data.energy - 2)
          updated.quality = clamp(data.quality + 1)
          break
        case "sun":
          updated.energy = clamp(data.energy + 5)
          updated.hydration = clamp(data.hydration - 2)
          updated.quality = clamp(data.quality + 1)
          break
        case "care":
          updated.quality = clamp(data.quality + 5)
          updated.hydration = clamp(data.hydration - 1)
          updated.energy = clamp(data.energy - 1)
          break
      }
      onUpdate(updated)

      setCooldowns((prev) => ({ ...prev, [action]: true }))
      setTimeout(() => {
        setCooldowns((prev) => ({ ...prev, [action]: false }))
      }, 1500)
    },
    [data, cooldowns, onUpdate]
  )

  function handleResetConfirm() {
    setShowConfirm(false)
    onReset()
  }

  return (
    <div className="coffee-farm-bg min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="nes-container is-rounded mb-4" style={{ backgroundColor: "#faf3e0" }}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h1 className="text-sm md:text-base" style={{ color: "#2d1b0e" }}>
              {"\u2615 Tu Coffeemon"}
            </h1>
            <button
              type="button"
              className="nes-btn is-error"
              onClick={() => setShowConfirm(true)}
              style={{ fontSize: "0.6rem" }}
            >
              {"Reiniciar cultivo"}
            </button>
          </div>
        </div>

        {/* Confirm dialog */}
        {showConfirm && (
          <div className="nes-container is-rounded mb-4" style={{ backgroundColor: "#ffe0e0" }}>
            <p className="mb-4" style={{ fontSize: "0.65rem", color: "#2d1b0e", lineHeight: 2 }}>
              {"\u00BFSeguro que quieres arrancar tu cultivo desde cero?"}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                type="button"
                className="nes-btn is-error"
                onClick={handleResetConfirm}
                style={{ fontSize: "0.6rem" }}
              >
                {"Si, arrancar"}
              </button>
              <button
                type="button"
                className="nes-btn"
                onClick={() => setShowConfirm(false)}
                style={{ fontSize: "0.6rem" }}
              >
                {"Cancelar"}
              </button>
            </div>
          </div>
        )}

        {/* Main Coffeemon display */}
        <div className="nes-container is-rounded mb-4" style={{ backgroundColor: "#faf3e0" }}>
          <div
            className={`nes-container is-rounded ${typeConfig.bg} text-center py-8 mb-4`}
            style={{ minHeight: "200px" }}
          >
            <p className="mb-2" style={{ fontSize: "0.7rem", color: "#fff" }}>
              {data.name}
            </p>
            <div className="coffeemon-bounce coffeemon-blink">
              <span className="text-5xl md:text-7xl block my-4" role="img" aria-label={stage.label}>
                {stage.emoji}
              </span>
            </div>
            <p style={{ fontSize: "0.6rem", color: "#ddd" }}>
              {stage.label} &middot; {typeConfig.label}
            </p>
          </div>

          {/* Stats */}
          <div className="mb-4">
            <div className="mb-4">
              <label
                htmlFor="stat-hydration"
                className="flex items-center gap-2 mb-2"
                style={{ fontSize: "0.6rem", color: "#2d1b0e" }}
              >
                <span role="img" aria-hidden="true">{"\u{1F4A7}"}</span>
                {"Hidratacion"}{" "}
                <span style={{ color: "#209cee" }}>{data.hydration}/100</span>
              </label>
              <progress
                id="stat-hydration"
                className="nes-progress is-water"
                value={data.hydration}
                max={100}
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="stat-energy"
                className="flex items-center gap-2 mb-2"
                style={{ fontSize: "0.6rem", color: "#2d1b0e" }}
              >
                <span role="img" aria-hidden="true">{"\u2600\uFE0F"}</span>
                {"Energia Solar"}{" "}
                <span style={{ color: "#d4a017" }}>{data.energy}/100</span>
              </label>
              <progress
                id="stat-energy"
                className="nes-progress is-sun"
                value={data.energy}
                max={100}
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="stat-quality"
                className="flex items-center gap-2 mb-2"
                style={{ fontSize: "0.6rem", color: "#2d1b0e" }}
              >
                <span role="img" aria-hidden="true">{"\u{1F60A}"}</span>
                {"Calidad del Grano"}{" "}
                <span style={{ color: "#4caf50" }}>{data.quality}/100</span>
              </label>
              <progress
                id="stat-quality"
                className="nes-progress is-quality"
                value={data.quality}
                max={100}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="nes-container is-rounded with-title" style={{ backgroundColor: "#fff8e7" }}>
            <p className="title" style={{ backgroundColor: "#fff8e7", color: "#2d1b0e", fontSize: "0.6rem" }}>
              {"Acciones"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                className="nes-btn is-primary action-btn"
                disabled={cooldowns.water}
                onClick={() => handleAction("water")}
                style={{ fontSize: "0.6rem" }}
              >
                {"\u{1F4A7} Regar"}
              </button>
              <button
                type="button"
                className="nes-btn is-warning action-btn"
                disabled={cooldowns.sun}
                onClick={() => handleAction("sun")}
                style={{ fontSize: "0.6rem" }}
              >
                {"\u2600\uFE0F Exponer al sol"}
              </button>
              <button
                type="button"
                className="nes-btn is-success action-btn"
                disabled={cooldowns.care}
                onClick={() => handleAction("care")}
                style={{ fontSize: "0.6rem" }}
              >
                {"\u{1F9D1}\u200D\u{1F33E} Cuidar"}
              </button>
            </div>
          </div>
        </div>

        {/* Chat section */}
        <div className="mb-4">
          <CoffeemonChat data={data} onStatsChange={onUpdate} />
        </div>

        {/* Footer info */}
        <div className="nes-container is-rounded" style={{ backgroundColor: "#faf3e0" }}>
          <p className="text-center" style={{ fontSize: "0.5rem", color: "#8a7a6a", lineHeight: 2 }}>
            {"Creado el "}
            {new Date(data.createdAt).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>
    </div>
  )
}
