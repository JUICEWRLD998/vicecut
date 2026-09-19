import type { Metadata } from "next";
import { Archivo, Geist_Mono, Instrument_Sans } from "next/font/google";
import { MotionConfig } from "motion/react";
import "./globals.css";

/**
 * Type chosen in Phase 2 (pairing A, Editorial Condensed).
 *
 * Archivo is loaded with the `wdth` axis because the condensed cut is the whole
 * point: the display face is Archivo tightened to wdth 76, not a poster family.
 * Dropping `axes: ['wdth']` would silently fall back to the normal width and the
 * masthead would read as a generic grotesk.
 */
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VICE CUT — The Mission Director",
  description:
    "Edit the world. Lock the frame. Roll the mission. Direct a crime-mission scene yourself, then watch your edit become the opening shot.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${instrumentSans.variable} ${geistMono.variable}`}
    >
      <body>
        {/* reducedMotion="user" makes every child animation respect the OS
            setting (transforms removed, opacity kept) — §24 without per-component
            branching. */}
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </body>
    </html>
  );
}
