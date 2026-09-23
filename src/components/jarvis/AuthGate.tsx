"use client";

import { JarvisApp } from "./JarvisApp";

export function AuthGate() {
  return (
    <>
      <div className="scene" />
      <div className="scene-grid" />
      <div className="scene-noise" />
      <JarvisApp />
    </>
  );
}
