"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type {
  CoffeemonData,
  ChatMessage,
  CoffeemonMemory,
} from "@/lib/coffeemon-types"

const MAX_MEMORIES = 10

const MEMORY_PATTERNS = [
  /me gusta\s+(.+)/i,
  /prefiero\s+(.+)/i,
  /mi nombre es\s+(.+)/i,
  /tengo una?\s+(.+)/i,
  /me encanta\s+(.+)/i,
  /soy\s+(.+)/i,
  /trabajo en\s+(.+)/i,
  /mi favorit[oa]\s+(.+)/i,
  /me llamo\s+(.+)/i,
  /vivo en\s+(.+)/i,
]

interface CoffeemonChatProps {
  data: CoffeemonData
  coins: number
  chat: ChatMessage[]
  memories: CoffeemonMemory[]
  userEmail: string | null
  onStatsChange: (data: CoffeemonData) => void
  onCoinsChange: (amount: number) => void
  onHistoryAdd: (action: string, coins: number) => void
  onChatUpdate: (messages: ChatMessage[]) => void
  onMemoriesUpdate: (memories: CoffeemonMemory[]) => void
}

interface StatPopup {
  id: string
  text: string
  color: string
}

function detectMemory(text: string): string | null {
  for (const pattern of MEMORY_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      return text.trim()
    }
  }
  return null
}

function clamp(val: number) {
  return Math.max(0, Math.min(100, val))
}

export function CoffeemonChat({
  data,
  coins,
  chat,
  memories,
  onStatsChange,
  onCoinsChange,
  onHistoryAdd,
  onChatUpdate,
  onMemoriesUpdate,
}: CoffeemonChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(chat)
  const [currentMemories, setCurrentMemories] = useState<CoffeemonMemory[]>(memories)
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "info" | "success" | "error" } | null>(null)
  const [statPopups, setStatPopups] = useState<StatPopup[]>([])
  const [consecutiveCount, setConsecutiveCount] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Sync with parent state
  useEffect(() => {
    setMessages(chat)
  }, [chat])

  useEffect(() => {
    setCurrentMemories(memories)
  }, [memories])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const showStatus = useCallback((text: string, type: "info" | "success" | "error") => {
    setStatusMessage({ text, type })
    setTimeout(() => setStatusMessage(null), 2500)
  }, [])

  const showStatPopup = useCallback((text: string, color: string) => {
    const id = crypto.randomUUID()
    setStatPopups((prev) => [...prev, { id, text, color }])
    setTimeout(() => {
      setStatPopups((prev) => prev.filter((p) => p.id !== id))
    }, 2000)
  }, [])

  // Anti-farming coin reward logic
  // At 0 coins: always reward (guaranteed escape)
  // Below 100: 50% chance, above: 15% chance
  function calculateCoinReward(currentCoins: number): number {
    if (currentCoins <= 0) return Math.floor(Math.random() * 4) + 3 // 3-6 guaranteed
    const probability = currentCoins < 100 ? 0.5 : 0.15
    if (Math.random() > probability) return 0
    return Math.floor(Math.random() * 4) + 2 // 2-5 coins
  }

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || isTyping) return

    const userMessage: ChatMessage = { role: "user", content: trimmed }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    onChatUpdate(updatedMessages)
    setInput("")

    // Stats affected by chat
    const newConsecutive = consecutiveCount + 1
    setConsecutiveCount(newConsecutive)

    let energyChange = -3
    if (newConsecutive > 5) {
      energyChange -= 5
      showStatPopup("-5 Energia (fatiga)", "#c0392b")
    }

    const updatedData = {
      ...data,
      quality: clamp(data.quality + 5),
      energy: clamp(data.energy + energyChange),
    }
    onStatsChange(updatedData)
    showStatPopup("+5 Calidad", "#27ae60")
    showStatPopup(`${energyChange} Energia`, "#e67e22")

    // Coin reward
    const coinReward = calculateCoinReward(coins)
    if (coinReward > 0) {
      onCoinsChange(coinReward)
      onHistoryAdd("Chat con Coffeemon", coinReward)
      showStatPopup(`+${coinReward} $BEANS`, "#ff7a00")
    }

    // Detect memory
    const memoryContent = detectMemory(trimmed)
    let updatedMemories = currentMemories
    if (memoryContent) {
      const alreadyExists = currentMemories.some(
        (m) => m.content.toLowerCase() === memoryContent.toLowerCase()
      )
      if (!alreadyExists) {
        const newMemory: CoffeemonMemory = {
          id: crypto.randomUUID(),
          content: memoryContent,
          createdAt: new Date().toISOString(),
        }
        updatedMemories = [...currentMemories, newMemory].slice(-MAX_MEMORIES)
        setCurrentMemories(updatedMemories)
        onMemoriesUpdate(updatedMemories)
      }
    }

    // Show typing indicator + status
    setIsTyping(true)
    showStatus("Procesando...", "info")

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.slice(-10),
          stats: {
            hydration: updatedData.hydration,
            energy: updatedData.energy,
            quality: updatedData.quality,
          },
          memories: updatedMemories,
          name: data.name,
          type: data.type,
        }),
      })

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`)
      }

      const json = await res.json()
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: json.reply,
      }

      const finalMessages = [...updatedMessages, assistantMessage]
      setMessages(finalMessages)
      onChatUpdate(finalMessages)
      showStatus("Listo!", "success")
    } catch {
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "Zzz... se me enredo una raiz. Intenta de nuevo. \u{1F331}",
      }
      const finalMessages = [...updatedMessages, errorMessage]
      setMessages(finalMessages)
      onChatUpdate(finalMessages)
      showStatus("Error al conectar. Intenta de nuevo.", "error")
    } finally {
      setIsTyping(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className="nes-container is-rounded"
      style={{ backgroundColor: "#faf3e0" }}
    >
      <h2
        className="text-center mb-4"
        style={{ fontSize: "0.7rem", color: "#2d1b0e" }}
      >
        {"Habla con tu Coffeemon"}
      </h2>

      {/* Memories indicator */}
      {currentMemories.length > 0 && (
        <div className="text-center mb-3">
          <span
            style={{
              fontSize: "0.55rem",
              color: "#6b8f3a",
              backgroundColor: "#e8f5e9",
              padding: "4px 10px",
              border: "2px solid #6b8f3a",
            }}
          >
            {"\u{1F9E0} "}
            {currentMemories.length}
            {" memorias cultivadas"}
          </span>
        </div>
      )}

      {/* Stat popups */}
      <div className="chat-stat-popups">
        {statPopups.map((popup) => (
          <div
            key={popup.id}
            className="chat-stat-popup"
            style={{ color: popup.color }}
          >
            {popup.text}
          </div>
        ))}
      </div>

      {/* System status messages */}
      {statusMessage && (
        <div
          className="status-toast mb-3 text-center py-2 px-3"
          style={{
            fontSize: "0.5rem",
            border: "3px solid",
            borderColor:
              statusMessage.type === "success"
                ? "#27ae60"
                : statusMessage.type === "error"
                  ? "#c0392b"
                  : "#e67e22",
            backgroundColor:
              statusMessage.type === "success"
                ? "#e8f5e9"
                : statusMessage.type === "error"
                  ? "#fdecea"
                  : "#fff8e1",
            color:
              statusMessage.type === "success"
                ? "#1b5e20"
                : statusMessage.type === "error"
                  ? "#b71c1c"
                  : "#e65100",
          }}
        >
          {statusMessage.type === "success" && "\u2714 "}
          {statusMessage.type === "error" && "\u2716 "}
          {statusMessage.type === "info" && "\u231B "}
          {statusMessage.text}
        </div>
      )}

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="chat-messages-area mb-4"
        style={{
          height: "260px",
          overflowY: "auto",
          backgroundColor: "#fff8e7",
          border: "4px solid #2d1b0e",
          padding: "12px",
        }}
      >
        {messages.length === 0 && !isTyping && (
          <div
            className="text-center"
            style={{
              color: "#8a7a6a",
              fontSize: "0.55rem",
              lineHeight: 2,
              paddingTop: "80px",
            }}
          >
            {"Escribe algo para hablar con "}
            {data.name}
            {"..."}
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`chat-bubble-wrapper ${
              msg.role === "user" ? "chat-user" : "chat-assistant"
            }`}
          >
            <div
              className={`chat-bubble ${
                msg.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"
              }`}
            >
              {msg.role === "assistant" && (
                <span className="chat-bubble-name">{data.name}</span>
              )}
              <p className="chat-bubble-text">{msg.content}</p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="chat-bubble-wrapper chat-assistant">
            <div className="chat-bubble chat-bubble-assistant">
              <span className="chat-bubble-name">{data.name}</span>
              <p className="chat-bubble-text chat-typing">
                {"Coffeemon esta creciendo ideas\u2026"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex gap-2 items-end">
        <input
          type="text"
          className="nes-input flex-1"
          placeholder={"Escribe un mensaje..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isTyping}
          style={{ fontSize: "0.6rem" }}
          aria-label="Mensaje para tu Coffeemon"
        />
        <button
          type="button"
          className="nes-btn is-primary"
          onClick={handleSend}
          disabled={isTyping || !input.trim()}
          style={{ fontSize: "0.6rem", whiteSpace: "nowrap" }}
        >
          {"Enviar"}
        </button>
      </div>
    </div>
  )
}
