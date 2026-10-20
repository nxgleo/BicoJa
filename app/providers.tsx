"use client";

import { SessionProvider } from "next-auth/react";

// O socket do chat agora fica em components/chat/ProvedorChat.tsx (só para quem está logado).
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
