"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"

const HUB_API = "https://regenmon-final.vercel.app/api"

interface RegenmonProfile {
  id: string
  name: string
  ownerName: string
  sprite: string
  stage: number
  stats: {
    felicidad: number
    energia: number
    hambre: number
  }
  totalPoints: number
  balance: number
  totalVisits: number
  createdAt: string
}

interface Message {
  id: string
  from: string
  content: string
  createdAt: string
}

interface StatPopup {
  id: string
  text: string
  color: string
}

export default function RegenmonProfilePage() {
  const params = useParams()
  const id = params.id as string

  const [profile, setProfile] = useState<RegenmonProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isOwn, setIsOwn] = useState(false)
  const [hubId, setHubId] = useState<string | null>(null)
  const [isRegistered, setIsRegistered] = useState(false)

  // Social interactions
  const [feedLoading, setFeedLoading] = useState(false)
  const [giftLoading, setGiftLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [showMessages, setShowMessages] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const [popups, setPopups] = useState<StatPopup[]>([])

  const showPopup = useCallback((text: string, color: string) => {
    const popupId = crypto.randomUUID()
    setPopups((prev) => [...prev, { id: popupId, text, color }])
    setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== popupId)), 2500)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = localStorage.getItem("hubCoffeemonId")
    const reg = localStorage.getItem("isRegisteredInHub")
    if (stored) {
      setHubId(stored)
      setIsOwn(stored === id)
    }
    if (reg === "true") setIsRegistered(true)
  }, [id])

  useEffect(() => {
    fetchProfile()
  }, [id])

  async function fetchProfile() {
    setLoading(true)
    setError("")
    try {
      let res = await fetch(`${HUB_API}/regenmon/${id}`)
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 2000))
        res = await fetch(`${HUB_API}/regenmon/${id}`)
        if (!res.ok) throw new Error("fail")
      }
      const json = await res.json()
      setProfile(json.data ?? json)
    } catch {
      setError("El HUB esta descansando, intenta despues ☕")
    } finally {
      setLoading(false)
    }
  }

  async function handleFeed() {
    if (!hubId || feedLoading) return
    setFeedLoading(true)
    try {
      const res = await fetch(`${HUB_API}/regenmon/${id}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromRegenmonId: hubId }),
      })
      if (res.ok) {
        showPopup("Alimentaste a " + (profile?.name ?? ""), "#27ae60")
      } else {
        showPopup("No se pudo alimentar", "#c0392b")
      }
    } catch {
      showPopup("El HUB esta descansando ☕", "#c0392b")
    } finally {
      setFeedLoading(false)
    }
  }

  async function handleGift() {
    if (giftLoading) return
    setGiftLoading(true)
    try {
      const res = await fetch(`${HUB_API}/regenmon/${id}/gift`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      if (res.ok) {
        showPopup("Regalo enviado! \u{1F381}", "#ff7a00")
      } else {
        showPopup("No se pudo enviar regalo", "#c0392b")
      }
    } catch {
      showPopup("El HUB esta descansando ☕", "#c0392b")
    } finally {
      setGiftLoading(false)
    }
  }

  async function loadMessages() {
    try {
      const res = await fetch(`${HUB_API}/regenmon/${id}/messages?limit=20`)
      if (res.ok) {
        const json = await res.json()
        setMessages(json.data ?? [])
      }
    } catch {
      // silent
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || sendingMessage) return
    if (newMessage.length > 140) {
      showPopup("Maximo 140 caracteres", "#c0392b")
      return
    }
    setSendingMessage(true)
    try {
      const res = await fetch(`${HUB_API}/regenmon/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromRegenmonId: hubId,
          content: newMessage.trim(),
        }),
      })
      if (res.ok) {
        showPopup("Mensaje enviado! \u{1F4AC}", "#27ae60")
        setNewMessage("")
        loadMessages()
      } else {
        showPopup("No se pudo enviar", "#c0392b")
      }
    } catch {
      showPopup("El HUB esta descansando ☕", "#c0392b")
    } finally {
      setSendingMessage(false)
    }
  }

  function toggleMessages() {
    if (!showMessages) loadMessages()
    setShowMessages((v) => !v)
  }

  if (loading) {
    return (
      <div className="coffee-farm-bg min-h-screen flex items-center justify-center">
        <div className="nes-container is-rounded" style={{ backgroundColor: "#faf3e0" }}>
          <p style={{ fontSize: "0.6rem", color: "#2d1b0e" }}>{"Cargando perfil..."}</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="coffee-farm-bg min-h-screen flex items-center justify-center">
        <div className="nes-container is-rounded text-center" style={{ backgroundColor: "#ffe0e0" }}>
          <p className="mb-3" style={{ fontSize: "0.55rem", color: "#c0392b", lineHeight: 2 }}>{error || "Perfil no encontrado"}</p>
          <a href="/" className="nes-btn" style={{ fontSize: "0.5rem", textDecoration: "none" }}>{"\u2190 Volver"}</a>
        </div>
      </div>
    )
  }

  const stats = profile.stats ?? { felicidad: 0, energia: 0, hambre: 0 }

  return (
    <div className="coffee-farm-bg min-h-screen">
      <div className="p-4">
        <div className="max-w-2xl mx-auto">
          {/* Popups */}
          <div className="coin-popup-container">
            {popups.map((p) => (
              <div key={p.id} className="coin-popup" style={{ color: p.color }}>{p.text}</div>
            ))}
          </div>

          {/* Header */}
          <div className="nes-container is-rounded mb-4" style={{ backgroundColor: "#faf3e0" }}>
            <div className="flex items-center justify-between">
              <a href="/" className="nes-btn" style={{ fontSize: "0.5rem", textDecoration: "none" }}>{"\u2190 Volver"}</a>
              <h1 style={{ fontSize: "0.6rem", color: "#2d1b0e" }}>
                {isOwn ? "\u{1F464} Mi Perfil" : "\u{1F464} Perfil"}
              </h1>
              <div style={{ width: "80px" }} />
            </div>
          </div>

          {/* Visit mode indicator */}
          {!isOwn && (
            <div className="nes-container is-rounded mb-4 text-center" style={{ backgroundColor: "#e8f4fd", borderColor: "#209cee" }}>
              <div className="flex items-center justify-center gap-2">
                <span style={{ fontSize: "1rem" }}>{"\u{1F440}"}</span>
                <div>
                  <p style={{ fontSize: "0.55rem", color: "#209cee", fontWeight: "bold" }}>{"MODO VISITA"}</p>
                  <p style={{ fontSize: "0.4rem", color: "#6b98b8", lineHeight: 2 }}>{"Solo lectura \u2014 no puedes modificar este Coffeemon"}</p>
                </div>
              </div>
            </div>
          )}

          {/* Own profile indicator */}
          {isOwn && (
            <div className="nes-container is-rounded mb-4 text-center" style={{ backgroundColor: "#e8fde8", borderColor: "#27ae60" }}>
              <p style={{ fontSize: "0.5rem", color: "#27ae60" }}>{"\u2705 Este es tu Coffeemon"}</p>
            </div>
          )}

          {/* Profile card */}
          <div className="nes-container is-rounded mb-4" style={{ backgroundColor: "#faf3e0" }}>
            <div className="text-center mb-4">
              {profile.sprite && (
                <img
                  src={profile.sprite}
                  alt={profile.name}
                  style={{ width: "64px", height: "64px", imageRendering: "pixelated", margin: "0 auto 8px" }}
                />
              )}
              <p style={{ fontSize: "0.7rem", color: "#2d1b0e" }}>{profile.name}</p>
              <p style={{ fontSize: "0.45rem", color: "#8a7a6a", marginTop: "4px" }}>
                {"Dueno: "}{profile.ownerName}{" \u00B7 Etapa "}{profile.stage ?? 1}
              </p>
            </div>

            {/* Stats */}
            <div className="mb-4">
              <div className="mb-3">
                <label className="flex items-center gap-2 mb-1" style={{ fontSize: "0.5rem", color: "#2d1b0e" }}>
                  {"\u{1F60A} Felicidad "}
                  <span style={{ color: "#209cee" }}>{stats.felicidad}/100</span>
                </label>
                <progress className="nes-progress is-primary" value={stats.felicidad} max={100} />
              </div>
              <div className="mb-3">
                <label className="flex items-center gap-2 mb-1" style={{ fontSize: "0.5rem", color: "#2d1b0e" }}>
                  {"\u26A1 Energia "}
                  <span style={{ color: "#d4a017" }}>{stats.energia}/100</span>
                </label>
                <progress className="nes-progress is-warning" value={stats.energia} max={100} />
              </div>
              <div className="mb-3">
                <label className="flex items-center gap-2 mb-1" style={{ fontSize: "0.5rem", color: "#2d1b0e" }}>
                  {"\u{1F354} Hambre "}
                  <span style={{ color: "#4caf50" }}>{stats.hambre}/100</span>
                </label>
                <progress className="nes-progress is-success" value={stats.hambre} max={100} />
              </div>
            </div>

            {/* Meta info */}
            <div className="grid grid-cols-2 gap-2 mb-4" style={{ fontSize: "0.45rem", color: "#2d1b0e", lineHeight: 2 }}>
              <p>{"\u{1F3C6} Puntos: "}{profile.totalPoints ?? 0}</p>
              <p>{"\u{1F34A} Balance: "}{profile.balance ?? 0}</p>
              <p>{"\u{1F440} Visitas: "}{profile.totalVisits ?? 0}</p>
              <p>{"\u{1F4C5} "}{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "—"}</p>
            </div>
          </div>

          {/* Social buttons (only if not own profile and registered) */}
          {!isOwn && isRegistered && hubId && (
            <div className="nes-container is-rounded mb-4" style={{ backgroundColor: "#fff8e7" }}>
              <p className="mb-3" style={{ fontSize: "0.5rem", color: "#2d1b0e" }}>{"Interacciones"}</p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  className="nes-btn is-success w-full"
                  disabled={feedLoading}
                  onClick={handleFeed}
                  style={{ fontSize: "0.5rem" }}
                >
                  {feedLoading ? "Alimentando..." : "\u{1F35E} Alimentar"}
                </button>
                <button
                  type="button"
                  className="nes-btn is-warning w-full"
                  disabled={giftLoading}
                  onClick={handleGift}
                  style={{ fontSize: "0.5rem" }}
                >
                  {giftLoading ? "Enviando..." : "\u{1F381} Regalar"}
                </button>
                <button
                  type="button"
                  className="nes-btn is-primary w-full"
                  onClick={toggleMessages}
                  style={{ fontSize: "0.5rem" }}
                >
                  {showMessages ? "\u{1F4AC} Ocultar Mensajes" : "\u{1F4AC} Mensajes"}
                </button>
              </div>

              {/* Messages section */}
              {showMessages && (
                <div className="mt-4">
                  {/* Send message */}
                  <div className="mb-3">
                    <textarea
                      className="nes-textarea w-full"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value.slice(0, 140))}
                      placeholder="Escribe un mensaje (max 140)"
                      rows={2}
                      style={{ fontSize: "0.45rem" }}
                    />
                    <div className="flex items-center justify-between mt-1">
                      <span style={{ fontSize: "0.4rem", color: "#8a7a6a" }}>{newMessage.length}/140</span>
                      <button
                        type="button"
                        className="nes-btn is-primary"
                        disabled={sendingMessage || !newMessage.trim()}
                        onClick={handleSendMessage}
                        style={{ fontSize: "0.45rem", padding: "4px 8px" }}
                      >
                        {"Enviar"}
                      </button>
                    </div>
                  </div>

                  {/* Message list */}
                  {messages.length === 0 ? (
                    <p style={{ fontSize: "0.45rem", color: "#8a7a6a" }}>{"No hay mensajes aun"}</p>
                  ) : (
                    <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className="mb-2 p-2"
                          style={{ backgroundColor: "#faf3e0", borderLeft: "3px solid #ff7a00" }}
                        >
                          <p style={{ fontSize: "0.4rem", color: "#8a7a6a" }}>{msg.from}</p>
                          <p style={{ fontSize: "0.45rem", color: "#2d1b0e", lineHeight: 1.8 }}>{msg.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Back to leaderboard */}
          <div className="text-center">
            <a
              href="/leaderboard"
              className="nes-btn w-full"
              style={{ fontSize: "0.5rem", textDecoration: "none" }}
            >
              {"\u{1F3C6} Ver Leaderboard"}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
