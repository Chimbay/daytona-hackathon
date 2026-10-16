import type { Metadata } from "next";
import { IdeaSections } from "./IdeaSections";

export const metadata: Metadata = { title: "Imagine · sections preview" };

// Neutral review backdrop only; the real landing page supplies its own sky.
export default function SectionsPreview() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(ellipse_at_20%_0%,#ffffff_0%,transparent_55%),radial-gradient(ellipse_at_90%_40%,#e8eefb_0%,transparent_60%),linear-gradient(180deg,#eef2f8,#f6f1f4)] font-serif text-slate-800 dark:bg-[radial-gradient(ellipse_at_20%_0%,#2a3247_0%,transparent_55%),linear-gradient(180deg,#151a26,#1d1a26)] dark:text-slate-100">
      <IdeaSections />
    </main>
  );
}
