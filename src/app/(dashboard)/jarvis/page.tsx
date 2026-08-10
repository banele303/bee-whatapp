import type { Metadata } from "next";
import { JarvisPageClient } from "./jarvis-client";

export const metadata: Metadata = {
  title: "Jarvis AI",
  description: "Voice-first AI operating system — Jarvis Control Center",
};

export default function JarvisPage() {
  return <JarvisPageClient />;
}
