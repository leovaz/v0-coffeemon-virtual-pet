"use client";

import { PrivyProvider } from '@privy-io/react-auth';

export function PrivyWrapper({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}>
      {children}
    </PrivyProvider>
  );
}


import { PrivyProvider, usePrivy } from "@privy-io/react-auth"
import { PrivySafeContext, type PrivySafeState } from "@/lib/use-privy-safe"

function PrivyBridge({ children }: { children: React.ReactNode }) {
  const privy = usePrivy()
  const value: PrivySafeState = {
    ready: privy.ready,
    authenticated: privy.authenticated,
    user: privy.user
      ? { email: privy.user.email ? { address: privy.user.email.address } : undefined }
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

function isValidPrivyAppId(id: string | undefined): id is string {
  // Privy app IDs follow the pattern "cl..." or similar alphanumeric strings
  // Must be truthy and at least 10 chars to be plausibly valid
  return typeof id === "string" && id.length >= 10 && !/\s/.test(id)
}

export function PrivyWrapper({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID

  if (!isValidPrivyAppId(appId)) {
    // No valid Privy configured -- use fallback context (guest mode)
    return <>{children}</>
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["google", "email"],
        appearance: {
          theme: "dark",
          accentColor: "#ff7a00",
          logo: undefined,
        },
        embeddedWallets: {
          createOnLogin: "off",
        },
      }}
    >
      <PrivyBridge>{children}</PrivyBridge>
    </PrivyProvider>
  )
}
