import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "HumanAtlas — 3D Anatomy Explorer",
  description: "Interactive 3D explorer for brain, eye, and skin anatomy with an Allen Human Brain Atlas MRI browser.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="fa" dir="rtl"><body>{children}</body></html>;
}
