"use client";

import { ChatProvider } from "@/app/cherrychat/context/ChatContext";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return <ChatProvider>{children}</ChatProvider>;
}
