"use client"

import { useState } from "react"
import type { HistoryEntry } from "@/lib/coffeemon-types"

interface CoffeemonHistoryProps {
  history: HistoryEntry[]
}

function timeAgo(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diff = now - then
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return "ahora"
  if (minutes < 60) return `hace ${minutes} min`
  if (hours < 24) return `hace ${hours}h`
  return `hace ${days}d`
}

export function CoffeemonHistory({ history }: CoffeemonHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (history.length === 0) return null

  const reversed = [...history].reverse()

  return (
    <div
      className="nes-container is-rounded mb-4"
      style={{ backgroundColor: "#faf3e0" }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left flex items-center justify-between"
        style={{ fontSize: "0.6rem", color: "#2d1b0e" }}
      >
        <span>{"Historial"}</span>
        <span
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            display: "inline-block",
          }}
        >
          {"v"}
        </span>
      </button>

      {isOpen && (
        <div className="mt-4">
          {reversed.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between py-2"
              style={{
                borderBottom: "2px solid #e8d5b7",
                fontSize: "0.5rem",
                color: "#2d1b0e",
              }}
            >
              <div className="flex-1">
                <span>{entry.action}</span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  style={{
                    color: entry.coins >= 0 ? "#27ae60" : "#c0392b",
                    fontWeight: "bold",
                  }}
                >
                  {entry.coins >= 0 ? `+${entry.coins}` : entry.coins}
                  {" $BEANS"}
                </span>
                <span style={{ color: "#8a7a6a", fontSize: "0.4rem" }}>
                  {timeAgo(entry.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
