"use client";

import CherryChatApp from "@/app/cherrychat/CherryChatApp";

export default function HomePage() {
  return (
    <section className="panel mx-auto h-[calc(100dvh-190px)] min-h-[540px] w-full max-w-[1400px] overflow-hidden rounded-2xl p-0 sm:h-[calc(100vh-120px)] sm:rounded-3xl">
      <CherryChatApp />
    </section>
  );
}
