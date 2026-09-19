import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MissionStage } from "@/components/missions/MissionStage";
import { getMission, missionIds } from "@/data/missions";

export function generateStaticParams() {
  return missionIds().map((id) => ({ id }));
}

export async function generateMetadata(
  props: PageProps<"/mission/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const mission = getMission(id);
  return { title: mission ? `${mission.name} — VICE CUT` : "VICE CUT" };
}

export default async function MissionPage(props: PageProps<"/mission/[id]">) {
  const { id } = await props.params;
  const mission = getMission(id);
  if (!mission) notFound();
  return <MissionStage mission={mission} />;
}
