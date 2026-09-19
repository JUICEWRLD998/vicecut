import { redirect } from "next/navigation";

export default function Home() {
  // Phase 1 routes straight to the technical spike. The real title screen
  // lands here in Phase 3.
  redirect("/spike");
}
