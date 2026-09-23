"use client";

import { ProfilePage } from "./ProfilePage";

export function ProfileGate() {
  return (
    <>
      <div className="scene" />
      <div className="scene-grid" />
      <div className="scene-noise" />
      <ProfilePage />
    </>
  );
}
