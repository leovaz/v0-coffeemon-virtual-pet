"use client"

import { useState, useCallback } from "react"
import type { CoffeemonData, HistoryEntry, ChatMessage, CoffeemonMemory, TrainingData } from "@/lib/coffeemon-types"
import { CoffeemonChat } from "@/components/coffeemon/coffeemon-chat"
import { CoffeemonHeader } from "@/components/coffeemon/coffeemon-header"
import { CoffeemonHistory } from "@/components/coffeemon/coffeemon-history"
import { CoffeemonTraining } from "@/components/coffeemon/coffeemon-training"
import { SocialHub } from "@/components/coffeemon/social-hub"

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

interface StatPopup {
  id: string
  text: string
  color: string
}

type TabId = "main" | "training" | "social"

interface CoffeemonViewProps {
  data: CoffeemonData
  coins: number
  history: HistoryEntry[]
  chat: ChatMessage[]
  memories: CoffeemonMemory[]
  training: TrainingData
  userEmail: string | null
  onUpdate: (data: CoffeemonData) => void
  onCoinsChange: (amount: number) => void
  onHistoryAdd: (action: string, coins: number) => void
  onChatUpdate: (messages: ChatMessage[]) => void
  onMemoriesUpdate: (memories: CoffeemonMemory[]) => void
  onTrainingUpdate: (training: TrainingData) => void
  onReset: () => void
}

export function CoffeemonView({
  data,
  coins,
  history,
  chat,
  memories,
  training,
  userEmail,
  onUpdate,
  onCoinsChange,
  onHistoryAdd,
  onChatUpdate,
  onMemoriesUpdate,
  onTrainingUpdate,
  onReset,
}: CoffeemonViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("main")
  const [showConfirm, setShowConfirm] = useState(false)
  const [cooldowns, setCooldowns] = useState({
    water: false,
    sun: false,
    care: false,
    feed: false,
  })
  const [statPopups, setStatPopups] = useState<StatPopup[]>([])
  const [feedReaction, setFeedReaction] = useState("")
  const [claimCooldown, setClaimCooldown] = useState(false)

  // Check if user can claim free BEANS (cooldown: 3 minutes)
  const CLAIM_COOLDOWN_KEY = "coffeemon_last_claim"
  const CLAIM_COOLDOWN_MS = 3 * 60 * 1000 // 3 minutes
  const CLAIM_AMOUNT = 25

  const canClaim = (() => {
    if (typeof window === "undefined") return false
    if (claimCooldown) return false
    const last = localStorage.getItem(CLAIM_COOLDOWN_KEY)
    if (!last) return true
    return Date.now() - parseInt(last, 10) > CLAIM_COOLDOWN_MS
  })()

  const avgStats = (data.hydration + data.energy + data.quality) / 3
  const stage = [...STAGE_EMOJIS].reverse().find((s) => avgStats >= s.min) ?? STAGE_EMOJIS[0]
  const typeConfig = TYPE_CONFIG[data.type]

  const clamp = (val: number) => Math.max(0, Math.min(100, val))

  const showPopup = useCallback((text: string, color: string) => {
    const id = crypto.randomUUID()
    setStatPopups((prev) => [...prev, { id, text, color }])
    setTimeout(() => {
      setStatPopups((prev) => prev.filter((p) => p.id !== id))
    }, 2500)
  }, [])

  const handleClaim = useCallback(() => {
    if (!canClaim) return
    localStorage.setItem(CLAIM_COOLDOWN_KEY, Date.now().toString())
    setClaimCooldown(true)
    onCoinsChange(CLAIM_AMOUNT)
    onHistoryAdd(`Reclamo diario de $BEANS`, CLAIM_AMOUNT)
    showPopup(`+${CLAIM_AMOUNT} $BEANS`, "#ff7a00")
    showPopup("Cosecha de emergencia!", "#27ae60")
    setTimeout(() => setClaimCooldown(false), CLAIM_COOLDOWN_MS)
  }, [canClaim, onCoinsChange, onHistoryAdd, showPopup])

  const handleAction = useCallback(
    (action: "water" | "sun" | "care") => {
      if (cooldowns[action]) return

      const updated = { ...data }
      switch (action) {
        case "water":
          updated.hydration = clamp(data.hydration + 5)
          updated.energy = clamp(data.energy - 2)
          updated.quality = clamp(data.quality + 1)
          showPopup("+5 Hidratacion", "#209cee")
          break
        case "sun":
          updated.energy = clamp(data.energy + 5)
          updated.hydration = clamp(data.hydration - 2)
          updated.quality = clamp(data.quality + 1)
          showPopup("+5 Energia", "#f5c518")
          break
        case "care":
          updated.quality = clamp(data.quality + 5)
          updated.hydration = clamp(data.hydration - 1)
          updated.energy = clamp(data.energy - 1)
          showPopup("+5 Calidad", "#4caf50")
          break
      }
      onUpdate(updated)

      const labels = { water: "Regar", sun: "Exponer al sol", care: "Cuidar" }
      onHistoryAdd(labels[action], 0)

      setCooldowns((prev) => ({ ...prev, [action]: true }))
      setTimeout(() => {
        setCooldowns((prev) => ({ ...prev, [action]: false }))
      }, 1500)
    },
    [data, cooldowns, onUpdate, onHistoryAdd]
  )

  const handleFeed = useCallback(() => {
    if (cooldowns.feed) return
    if (coins < 10) {
      showPopup("Necesitas 10 $BEANS", "#c0392b")
      return
    }
    // Check if all stats are max
    if (data.hydration >= 100 && data.energy >= 100 && data.quality >= 100) {
      showPopup("Stats al maximo!", "#e67e22")
      return
    }

    setCooldowns((prev) => ({ ...prev, feed: true }))

    // Spend coins
    onCoinsChange(-10)
    showPopup("-10 $BEANS", "#c0392b")

    // Boost stats
    const updated = {
      ...data,
      hydration: clamp(data.hydration + 8),
      energy: clamp(data.energy + 5),
      quality: clamp(data.quality + 3),
    }
    onUpdate(updated)
    onHistoryAdd("Alimentar Coffeemon", -10)

    // Show stat popups for feed
    showPopup("+8 Hidratacion", "#209cee")
    showPopup("+5 Energia", "#f5c518")
    showPopup("+3 Calidad", "#4caf50")

    // Show reaction
    setFeedReaction("Absorbiendo nutrientes!")
    setTimeout(() => setFeedReaction(""), 2500)

    setTimeout(() => {
      setCooldowns((prev) => ({ ...prev, feed: false }))
    }, 3000)
  }, [coins, data, cooldowns.feed, onCoinsChange, onUpdate, showPopup, onHistoryAdd])

  function handleResetConfirm() {
    setShowConfirm(false)
    onReset()
  }

  const canFeed = coins >= 10 && !(data.hydration >= 100 && data.energy >= 100 && data.quality >= 100)

  return (
    <div className="coffee-farm-bg min-h-screen">
      <CoffeemonHeader coins={coins} />

      <div className="p-4">
        <div className="max-w-2xl mx-auto">
          {/* Tab navigation */}
          <div className="flex gap-0 mb-4">
            <button
              type="button"
              className={`nes-btn flex-1 training-tab-btn ${activeTab === "main" ? "is-primary" : ""}`}
              onClick={() => setActiveTab("main")}
              style={{ fontSize: "0.5rem" }}
            >
              {"\u{1F331} Cuidar"}
            </button>
            <button
              type="button"
              className={`nes-btn flex-1 training-tab-btn ${activeTab === "training" ? "is-warning" : ""}`}
              onClick={() => setActiveTab("training")}
              style={{ fontSize: "0.5rem" }}
            >
              {"\u{1F393} Entrenar"}
            </button>
            <button
              type="button"
              className={`nes-btn flex-1 training-tab-btn ${activeTab === "social" ? "is-success" : ""}`}
              onClick={() => setActiveTab("social")}
              style={{ fontSize: "0.5rem" }}
            >
              {"\u{1F30D} Social"}
            </button>
          </div>

          {/* Stat popups overlay */}
          <div className="coin-popup-container">
            {statPopups.map((popup) => (
              <div
                key={popup.id}
                className="coin-popup"
                style={{ color: popup.color }}
              >
                {popup.text}
              </div>
            ))}
          </div>

          {/* Training tab */}
          {activeTab === "training" && (
            <div className="mb-4">
              <CoffeemonTraining
                data={data}
                training={training}
                onStatsChange={onUpdate}
                onTrainingUpdate={onTrainingUpdate}
                onCoinsChange={onCoinsChange}
                onHistoryAdd={onHistoryAdd}
              />
            </div>
          )}

          {/* Social tab */}
          {activeTab === "social" && (
            <div className="mb-4">
              <SocialHub
                data={data}
                coins={coins}
                training={training}
                userEmail={userEmail}
                onCoinsChange={onCoinsChange}
                onHistoryAdd={onHistoryAdd}
              />
            </div>
          )}

          {/* Main tab content */}
          {activeTab === "main" && (<>

          {/* Top bar with reset */}
          <div className="nes-container is-rounded mb-4" style={{ backgroundColor: "#faf3e0" }}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <h1 className="text-sm md:text-base" style={{ color: "#2d1b0e" }}>
                {"Tu Coffeemon"}
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
                {"Seguro que quieres arrancar tu cultivo desde cero?"}
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
                {stage.label} {" \u00B7 "} {typeConfig.label}
              </p>

              {/* Feed reaction */}
              {feedReaction && (
                <div className="feed-reaction mt-3">
                  <span style={{ fontSize: "0.55rem", color: "#fff" }}>
                    {feedReaction}
                  </span>
                </div>
              )}
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  className="nes-btn is-primary action-btn"
                  disabled={cooldowns.water}
                  onClick={() => handleAction("water")}
                  style={{ fontSize: "0.5rem" }}
                >
                  {"\u{1F4A7} Regar"}
                </button>
                <button
                  type="button"
                  className="nes-btn is-warning action-btn"
                  disabled={cooldowns.sun}
                  onClick={() => handleAction("sun")}
                  style={{ fontSize: "0.5rem" }}
                >
                  {"\u2600\uFE0F Sol"}
                </button>
                <button
                  type="button"
                  className="nes-btn is-success action-btn"
                  disabled={cooldowns.care}
                  onClick={() => handleAction("care")}
                  style={{ fontSize: "0.5rem" }}
                >
                  {"\u{1F9D1}\u200D\u{1F33E} Cuidar"}
                </button>
                <button
                  type="button"
                  className={`nes-btn action-btn feed-btn ${canFeed ? "" : "is-disabled"}`}
                  disabled={cooldowns.feed || !canFeed}
                  onClick={handleFeed}
                  style={{ fontSize: "0.5rem" }}
                  title={coins < 10 ? "Necesitas 10 $BEANS" : "Alimentar tu Coffeemon"}
                >
                  {"Alimentar (10 $BEANS)"}
                </button>
              </div>
            </div>
          </div>

          {/* Claim free BEANS section */}
          {coins < 10 && (
            <div
              className="nes-container is-rounded mb-4 text-center"
              style={{ backgroundColor: "#fff3cd", borderColor: "#ff7a00" }}
            >
              <p
                className="mb-3"
                style={{ fontSize: "0.55rem", color: "#2d1b0e", lineHeight: 2 }}
              >
                {"Te quedaste sin $BEANS! Reclama una cosecha de emergencia."}
              </p>
              <button
                type="button"
                className={`nes-btn ${canClaim ? "is-warning" : ""}`}
                disabled={!canClaim}
                onClick={handleClaim}
                style={{ fontSize: "0.55rem" }}
              >
                {canClaim
                  ? `Reclamar ${CLAIM_AMOUNT} $BEANS`
                  : "Espera unos minutos..."}
              </button>
            </div>
          )}

          {/* Chat section */}
          <div className="mb-4">
            <CoffeemonChat
              data={data}
              coins={coins}
              chat={chat}
              memories={memories}
              userEmail={userEmail}
              onStatsChange={onUpdate}
              onCoinsChange={onCoinsChange}
              onHistoryAdd={onHistoryAdd}
              onChatUpdate={onChatUpdate}
              onMemoriesUpdate={onMemoriesUpdate}
            />
          </div>

          {/* History */}
          <CoffeemonHistory history={history} />

          </>)}

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
    </div>
  )
}
