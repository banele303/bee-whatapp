import type { Metadata } from "next";
import { JarvisProfileClient } from "./profile-client";

export const metadata: Metadata = {
  title: "Jarvis — Operator Profile",
  description: "Configure your Jarvis operator profile",
};

export default function JarvisProfilePage() {
  return <JarvisProfileClient />;
}
