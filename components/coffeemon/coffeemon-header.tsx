"use client"

import { usePrivySafe } from "@/lib/use-privy-safe"

interface CoffeemonHeaderProps {
  coins: number
}

export function CoffeemonHeader({ coins }: CoffeemonHeaderProps) {
  const { authenticated, user, login, logout, ready } = usePrivySafe()
  const userEmail = user?.email?.address ?? null

  return (
    <header
      className="sticky top-0 z-50"
      style={{ backgroundColor: "#2d1b0e" }}
    >
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Left: Logo */}
          <div className="flex items-center gap-2">
            <span style={{ fontSize: "0.7rem", color: "#ff7a00" }}>
              {"Coffeemon"}
            </span>
          </div>

          {/* Center: Coins */}
          <div
            className="flex items-center gap-2 px-3 py-1"
            style={{
              border: "3px solid #ff7a00",
              backgroundColor: "#3d2b1e",
            }}
          >
            <span style={{ fontSize: "0.7rem", color: "#c8b88a" }}>
              {"$BEANS"}
            </span>
            <span
              className="coins-display"
              style={{ fontSize: "0.7rem", color: "#ff7a00", fontWeight: "bold" }}
            >
              {coins}
            </span>
          </div>

          {/* Right: Auth */}
          <div className="flex items-center gap-2">
            {!ready ? (
              <span style={{ fontSize: "0.5rem", color: "#8a7a6a" }}>{"..."}</span>
            ) : authenticated ? (
              <>
                {userEmail && (
                  <span
                    className="hidden sm:inline"
                    style={{ fontSize: "0.45rem", color: "#c8b88a", maxWidth: "120px" }}
                    title={userEmail}
                  >
                    {userEmail.length > 16
                      ? userEmail.slice(0, 14) + "..."
                      : userEmail}
                  </span>
                )}
                <button
                  type="button"
                  className="nes-btn is-error"
                  onClick={() => logout()}
                  style={{ fontSize: "0.45rem", padding: "4px 8px" }}
                >
                  {"Salir"}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="nes-btn is-warning"
                onClick={login}
                style={{ fontSize: "0.5rem", padding: "4px 10px" }}
              >
                {"Iniciar Sesion"}
              </button>
            )}
          </div>
        </div>

        {/* Guest warning */}
        {ready && !authenticated && (
          <div className="text-center mt-2">
            <span style={{ fontSize: "0.4rem", color: "#c8b88a", lineHeight: 1.8 }}>
              {"Inicia sesion para guardar tu progreso"}
            </span>
          </div>
        )}
      </div>
    </header>
  )
}
