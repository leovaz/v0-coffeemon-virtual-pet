"use client"

import { useState, useEffect, useCallback } from "react"
import type { CoffeemonData, TrainingData } from "@/lib/coffeemon-types"
import { useHubSync } from "@/hooks/use-hub-sync"

const HUB_API = "https://regenmon-final.vercel.app/api"

const STAGE_EMOJIS = [
  { min: 0, emoji: "\u{1F331}", label: "Semilla" },
  { min: 25, emoji: "\u{1F33F}", label: "Planta" },
  { min: 50, emoji: "\u{1F352}", label: "Cerezo" },
  { min: 75, emoji: "\u2615", label: "Taza" },
]

function getSpriteUrl(emoji: string): string {
  const codepoints = [...emoji]
    .map((c) => c.codePointAt(0)?.toString(16))
    .filter(Boolean)
    .join("-")
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codepoints}.png`
}

function getStageEmoji(data: CoffeemonData): string {
  const avg = (data.hydration + data.energy + data.quality) / 3
  const stage = [...STAGE_EMOJIS].reverse().find((s) => avg >= s.min) ?? STAGE_EMOJIS[0]
  return stage.emoji
}

interface SocialHubProps {
  data: CoffeemonData
  coins: number
  training: TrainingData
  userEmail: string | null
  onCoinsChange: (amount: number) => void
  onHistoryAdd: (action: string, coins: number) => void
}

interface StatPopup {
  id: string
  text: string
  color: string
}

export function SocialHub({ data, coins, training, userEmail, onCoinsChange, onHistoryAdd }: SocialHubProps) {
  const [isRegistered, setIsRegistered] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [hubId, setHubId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [ownerName, setOwnerName] = useState("")
  const [ownerEmail, setOwnerEmail] = useState(userEmail ?? "")
  const [popups, setPopups] = useState<StatPopup[]>([])
  const [copied, setCopied] = useState(false)

  const { syncToHub } = useHubSync({ data, training, coins, onCoinsChange })

  const showPopup = useCallback((text: string, color: string) => {
    const id = crypto.randomUUID()
    setPopups((prev) => [...prev, { id, text, color }])
    setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== id)), 2500)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = localStorage.getItem("isRegisteredInHub")
    const storedId = localStorage.getItem("hubCoffeemonId")
    if (stored === "true" && storedId) {
      setIsRegistered(true)
      setHubId(storedId)
    }
    const pub = localStorage.getItem("coffeemonIsPublic")
    if (pub === "true") setIsPublic(true)
  }, [])

  useEffect(() => {
    setOwnerEmail(userEmail ?? "")
  }, [userEmail])

  async function handleRegister() {
    if (!ownerName.trim()) {
      showPopup("Ingresa tu nombre", "#c0392b")
      return
    }
    if (!ownerEmail.trim()) {
      showPopup("Ingresa tu email", "#c0392b")
      return
    }
    setLoading(true)
    setError("")

    const emoji = getStageEmoji(data)

    try {
      const res = await fetch(`${HUB_API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          ownerName: ownerName.trim(),
          ownerEmail: ownerEmail.trim(),
          appUrl: window.location.origin,
          sprite: getSpriteUrl(emoji),
        }),
      })

      if (!res.ok) {
        // Retry once
        await new Promise((r) => setTimeout(r, 2000))
        const retry = await fetch(`${HUB_API}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            ownerName: ownerName.trim(),
            ownerEmail: ownerEmail.trim(),
            appUrl: window.location.origin,
            sprite: getSpriteUrl(emoji),
          }),
        })
        if (!retry.ok) throw new Error("fail")
        const json = await retry.json()
        finishRegistration(json)
        return
      }

      const json = await res.json()
      finishRegistration(json)
    } catch {
      setError("El HUB esta descansando, intenta despues ☕")
    } finally {
      setLoading(false)
    }
  }

  function finishRegistration(json: { data?: { id?: string }; alreadyRegistered?: boolean }) {
    const id = json?.data?.id
    if (id) {
      localStorage.setItem("hubCoffeemonId", id)
      localStorage.setItem("isRegisteredInHub", "true")
      setHubId(id)
      setIsRegistered(true)
      showPopup("Registrado en el HUB! ☕", "#27ae60")
      onHistoryAdd("Registro en HUB Social", 0)
      // Sync immediately after registration
      setTimeout(() => syncToHub(), 500)
    } else if (json?.alreadyRegistered) {
      // Try to get id from response anyway
      const fallbackId = (json as Record<string, unknown>)?.data as { id?: string } | undefined
      if (fallbackId?.id) {
        localStorage.setItem("hubCoffeemonId", fallbackId.id)
        localStorage.setItem("isRegisteredInHub", "true")
        setHubId(fallbackId.id)
        setIsRegistered(true)
        showPopup("Ya estabas registrado! ☕", "#e67e22")
      }
    }
  }

  // Registration form
  if (!isRegistered) {
    return (
      <div>
        {/* Popups */}
        <div className="coin-popup-container">
          {popups.map((p) => (
            <div key={p.id} className="coin-popup" style={{ color: p.color }}>{p.text}</div>
          ))}
        </div>

        <div className="nes-container is-rounded" style={{ backgroundColor: "#faf3e0" }}>
          <h2 className="text-center mb-4" style={{ fontSize: "0.65rem", color: "#2d1b0e" }}>
            {"\u{1F30D} Unete al HUB Social"}
          </h2>
          <p className="mb-4 text-center" style={{ fontSize: "0.5rem", color: "#8a7a6a", lineHeight: 2 }}>
            {"Conecta tu Coffeemon con otros jugadores. Compite en el leaderboard, visita perfiles y envia regalos."}
          </p>

          <div className="mb-3">
            <label style={{ fontSize: "0.5rem", color: "#2d1b0e" }}>{"Tu nombre"}</label>
            <input
              type="text"
              className="nes-input mt-1"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Nombre"
              style={{ fontSize: "0.5rem" }}
            />
          </div>
          <div className="mb-4">
            <label style={{ fontSize: "0.5rem", color: "#2d1b0e" }}>{"Email"}</label>
            <input
              type="email"
              className="nes-input mt-1"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="tu@email.com"
              style={{ fontSize: "0.5rem" }}
            />
          </div>

          {error && (
            <p className="mb-3 text-center" style={{ fontSize: "0.5rem", color: "#c0392b", lineHeight: 2 }}>
              {error}
            </p>
          )}

          <button
            type="button"
            className="nes-btn is-warning w-full"
            disabled={loading}
            onClick={handleRegister}
            style={{ fontSize: "0.55rem" }}
          >
            {loading ? "Registrando..." : "\u{1F30D} Registrar en HUB"}
          </button>
        </div>
      </div>
    )
  }

  // Social panel (registered)
  return (
    <div>
      {/* Popups */}
      <div className="coin-popup-container">
        {popups.map((p) => (
          <div key={p.id} className="coin-popup" style={{ color: p.color }}>{p.text}</div>
        ))}
      </div>

      <div className="nes-container is-rounded" style={{ backgroundColor: "#faf3e0" }}>
        <div className="text-center mb-4">
          <span
            className="nes-badge"
            style={{ fontSize: "0.5rem" }}
          >
            <span className="is-warning" style={{ fontSize: "0.45rem" }}>{"HUB MEMBER ☕"}</span>
          </span>
        </div>

        <div className="text-center mb-4">
          <p style={{ fontSize: "0.6rem", color: "#2d1b0e" }}>{data.name}</p>
          <p style={{ fontSize: "0.5rem", color: "#ff7a00", marginTop: "4px" }}>
            {"\u{1F34A} "}{coins}{" $BEANS"}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href="/leaderboard"
            className="nes-btn is-primary w-full text-center"
            style={{ fontSize: "0.5rem", textDecoration: "none" }}
          >
            {"\u{1F3C6} Leaderboard"}
          </a>
          <a
            href={`/regenmon/${hubId}`}
            className="nes-btn is-warning w-full text-center"
            style={{ fontSize: "0.5rem", textDecoration: "none" }}
          >
            {"\u{1F464} Mi Perfil"}
          </a>
        </div>

        {/* Public visibility */}
        <div className="mt-4">
          <div className="nes-container is-rounded with-title" style={{ backgroundColor: "#fff8e7" }}>
            <p className="title" style={{ backgroundColor: "#fff8e7", color: "#2d1b0e", fontSize: "0.5rem" }}>
              {"\u{1F310} Visibilidad"}
            </p>

            {isPublic ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="nes-badge" style={{ fontSize: "0.4rem" }}>
                    <span className="is-success" style={{ fontSize: "0.4rem" }}>{"PUBLICO"}</span>
                  </span>
                  <span style={{ fontSize: "0.45rem", color: "#27ae60" }}>{"Tu Coffeemon es visible para todos"}</span>
                </div>

                {/* Public URL */}
                <div className="mb-3 p-2" style={{ backgroundColor: "#faf3e0", border: "2px dashed #ff7a00", wordBreak: "break-all" }}>
                  <p style={{ fontSize: "0.4rem", color: "#8a7a6a", marginBottom: "4px" }}>{"URL publica:"}</p>
                  <p style={{ fontSize: "0.45rem", color: "#2d1b0e" }}>
                    {typeof window !== "undefined" ? `${window.location.origin}/regenmon/${hubId}` : ""}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="nes-btn is-primary flex-1"
                    onClick={() => {
                      const url = `${window.location.origin}/regenmon/${hubId}`
                      navigator.clipboard.writeText(url).then(() => {
                        setCopied(true)
                        showPopup("URL copiada! \u{1F4CB}", "#27ae60")
                        setTimeout(() => setCopied(false), 2000)
                      })
                    }}
                    style={{ fontSize: "0.45rem" }}
                  >
                    {copied ? "\u2705 Copiado!" : "\u{1F4CB} Copiar URL"}
                  </button>
                  <button
                    type="button"
                    className="nes-btn is-error flex-1"
                    onClick={() => {
                      localStorage.setItem("coffeemonIsPublic", "false")
                      setIsPublic(false)
                      showPopup("Perfil ahora es privado \u{1F512}", "#c0392b")
                    }}
                    style={{ fontSize: "0.45rem" }}
                  >
                    {"\u{1F512} Hacer Privado"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="mb-3" style={{ fontSize: "0.45rem", color: "#8a7a6a", lineHeight: 2 }}>
                  {"Haz publico tu Coffeemon para que otros puedan visitarte, alimentarte y enviarte mensajes."}
                </p>
                <button
                  type="button"
                  className="nes-btn is-success w-full"
                  onClick={() => {
                    localStorage.setItem("coffeemonIsPublic", "true")
                    setIsPublic(true)
                    showPopup("Perfil publico activado! \u{1F30D}", "#27ae60")
                    onHistoryAdd("Perfil hecho publico", 0)
                    // Sync to hub
                    setTimeout(() => syncToHub(), 500)
                  }}
                  style={{ fontSize: "0.5rem" }}
                >
                  {"\u{1F30D} Hacer Publico"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="mt-4">
          <p className="mb-2" style={{ fontSize: "0.5rem", color: "#8a7a6a" }}>{"Actividad reciente"}</p>
          <div style={{ fontSize: "0.45rem", color: "#2d1b0e", lineHeight: 2 }}>
            <p>{"\u2705 Conectado al HUB"}</p>
            <p>{isPublic ? "\u{1F30D} Perfil publico" : "\u{1F512} Perfil privado"}</p>
            <p>{"\u{1F4CA} Puntos: "}{training.totalPoints}</p>
            <p>{"\u{1F3C5} Etapa: "}{training.stage}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
