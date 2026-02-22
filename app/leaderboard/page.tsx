"use client"

import { useState, useEffect } from "react"

const HUB_API = "https://regenmon-final.vercel.app/api"
const MEDALS = ["\u{1F947}", "\u{1F948}", "\u{1F949}"]

interface LeaderboardEntry {
  id: string
  name: string
  ownerName: string
  sprite: string
  stage: number
  totalPoints: number
  balance: number
}

interface LeaderboardResponse {
  data: LeaderboardEntry[]
  pagination?: {
    page: number
    totalPages: number
  }
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchLeaderboard(page)
  }, [page])

  async function fetchLeaderboard(p: number) {
    setLoading(true)
    setError("")
    try {
      let res = await fetch(`${HUB_API}/leaderboard?page=${p}&limit=10`)
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 2000))
        res = await fetch(`${HUB_API}/leaderboard?page=${p}&limit=10`)
        if (!res.ok) throw new Error("fail")
      }
      const json: LeaderboardResponse = await res.json()
      setEntries(json.data ?? [])
      setTotalPages(json.pagination?.totalPages ?? 1)
    } catch {
      setError("El HUB esta descansando, intenta despues ☕")
    } finally {
      setLoading(false)
    }
  }

  const offset = (page - 1) * 10

  return (
    <div className="coffee-farm-bg min-h-screen">
      <div className="p-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="nes-container is-rounded mb-4" style={{ backgroundColor: "#faf3e0" }}>
            <div className="flex items-center justify-between">
              <a
                href="/"
                className="nes-btn"
                style={{ fontSize: "0.5rem", textDecoration: "none" }}
              >
                {"\u2190 Volver"}
              </a>
              <h1 style={{ fontSize: "0.65rem", color: "#2d1b0e" }}>{"\u{1F3C6} Leaderboard"}</h1>
              <div style={{ width: "80px" }} />
            </div>
          </div>

          {loading && (
            <div className="nes-container is-rounded text-center" style={{ backgroundColor: "#faf3e0" }}>
              <p style={{ fontSize: "0.55rem", color: "#2d1b0e" }}>{"Cargando..."}</p>
            </div>
          )}

          {error && (
            <div className="nes-container is-rounded text-center" style={{ backgroundColor: "#ffe0e0" }}>
              <p style={{ fontSize: "0.55rem", color: "#c0392b", lineHeight: 2 }}>{error}</p>
            </div>
          )}

          {!loading && !error && entries.length === 0 && (
            <div className="nes-container is-rounded text-center" style={{ backgroundColor: "#faf3e0" }}>
              <p style={{ fontSize: "0.55rem", color: "#8a7a6a" }}>{"No hay participantes aun"}</p>
            </div>
          )}

          {!loading && !error && entries.map((entry, i) => {
            const rank = offset + i + 1
            const medal = rank <= 3 ? MEDALS[rank - 1] : null

            return (
              <div
                key={entry.id}
                className="nes-container is-rounded mb-3"
                style={{
                  backgroundColor: rank <= 3 ? "#fff8e7" : "#faf3e0",
                  borderColor: rank === 1 ? "#ff7a00" : undefined,
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div style={{ fontSize: medal ? "1.2rem" : "0.7rem", color: "#2d1b0e", minWidth: "30px", textAlign: "center" }}>
                    {medal ?? `#${rank}`}
                  </div>

                  {/* Sprite */}
                  {entry.sprite && (
                    <img
                      src={entry.sprite}
                      alt={entry.name}
                      style={{ width: "32px", height: "32px", imageRendering: "pixelated" }}
                    />
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: "0.55rem", color: "#2d1b0e" }}>{entry.name}</p>
                    <p style={{ fontSize: "0.4rem", color: "#8a7a6a" }}>
                      {entry.ownerName}{" \u00B7 Etapa "}{entry.stage ?? 1}
                    </p>
                  </div>

                  {/* Points & Balance */}
                  <div className="text-right">
                    <p style={{ fontSize: "0.5rem", color: "#ff7a00" }}>{entry.totalPoints ?? 0}{" pts"}</p>
                    <p style={{ fontSize: "0.4rem", color: "#8a7a6a" }}>{"\u{1F34A} "}{entry.balance ?? 0}</p>
                  </div>

                  {/* View button */}
                  <a
                    href={`/regenmon/${entry.id}`}
                    className="nes-btn is-primary"
                    style={{ fontSize: "0.4rem", textDecoration: "none", padding: "4px 8px" }}
                  >
                    {"Ver"}
                  </a>
                </div>
              </div>
            )
          })}

          {/* Pagination */}
          {!loading && !error && totalPages > 1 && (
            <div className="flex justify-center gap-3 mt-4">
              <button
                type="button"
                className="nes-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={{ fontSize: "0.5rem" }}
              >
                {"\u2190"}
              </button>
              <span style={{ fontSize: "0.5rem", color: "#c8b88a", alignSelf: "center" }}>
                {page}{" / "}{totalPages}
              </span>
              <button
                type="button"
                className="nes-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={{ fontSize: "0.5rem" }}
              >
                {"\u2192"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
