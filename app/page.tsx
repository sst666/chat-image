"use client";

import CherryChatApp from "@/app/cherrychat/CherryChatApp";

export default function HomePage() {
  return (
    <section className="panel mx-auto h-[calc(100vh-120px)] w-full max-w-[1400px] overflow-hidden p-0">
      <CherryChatApp />
    </section>
  );
}
