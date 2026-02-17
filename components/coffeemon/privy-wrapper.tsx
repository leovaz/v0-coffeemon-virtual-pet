"use client"

import { Component, type ReactNode } from "react"
import { PrivyProvider, usePrivy } from "@privy-io/react-auth"
import { PrivySafeContext, type PrivySafeState } from "@/lib/use-privy-safe"

// Error boundary that catches Privy initialization errors and falls back to guest mode
class PrivyErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.warn("[Coffeemon] Privy init failed, using guest mode:", error.message)
  }

  render() {
    if (this.state.hasError) {
      // Render children without Privy (guest mode via default context)
      return this.props.children
    }
    return this.props.children
  }
}

function PrivyBridge({ children }: { children: ReactNode }) {
  const privy = usePrivy()
  const value: PrivySafeState = {
    ready: privy.ready,
    authenticated: privy.authenticated,
    user: privy.user
      ? {
          email: privy.user.email
            ? { address: privy.user.email.address }
            : undefined,
        }
      : null,
    login: privy.login,
    logout: privy.logout,
  }
  return (
    <PrivySafeContext.Provider value={value}>
      {children}
    </PrivySafeContext.Provider>
  )
}

export function PrivyWrapper({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID

  // Quick check: if clearly empty/missing, skip entirely
  if (!appId || appId.trim().length < 5) {
    return <>{children}</>
  }

  // Wrap in error boundary so any Privy validation errors
  // (invalid app ID format, network issues, etc.) gracefully fall back to guest mode
  return (
    <PrivyErrorBoundary>
      <PrivyProvider
        appId={appId.trim()}
        config={{
          loginMethods: ["google", "email"],
          appearance: {
            theme: "dark",
            accentColor: "#ff7a00",
          },
          embeddedWallets: {
            createOnLogin: "off",
          },
        }}
      >
        <PrivyBridge>{children}</PrivyBridge>
      </PrivyProvider>
    </PrivyErrorBoundary>
  )
}
