import type { Metadata } from "next";
import { MissionSelect } from "@/components/missions/MissionSelect";

export const metadata: Metadata = {
  title: "Select Operation — VICE CUT",
};

export default function MissionsPage() {
  return <MissionSelect />;
}
