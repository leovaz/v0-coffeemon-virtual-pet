'use client';

import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { PrivySafeContext, type PrivySafeState } from "@/lib/use-privy-safe";

function PrivyBridge({ children }: { children: React.ReactNode }) {
  const privy = usePrivy();
  const value: PrivySafeState = {
    ready: privy.ready,
    authenticated: privy.authenticated,
    user: privy.user
      ? { email: privy.user.email ? { address: privy.user.email.address } : undefined }
      : null,
    login: privy.login,
    logout: privy.logout,
  };
  return (
    <PrivySafeContext.Provider value={value}>
      {children}
    </PrivySafeContext.Provider>
  );
}

function isValidPrivyAppId(id: string | undefined): id is string {
  return typeof id === "string" && id.length >= 10 && !/\s/.test(id);
}

export function PrivyWrapper({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!isValidPrivyAppId(appId)) {
    console.warn('Privy: NEXT_PUBLIC_PRIVY_APP_ID no configurada, modo guest');
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
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
  );
}
