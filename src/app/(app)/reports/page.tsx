import { PlannedFeature } from "@/components/planned";

export default function Page() {
  return <PlannedFeature title="Growth Reports" description="See how you improve over time."
    needs={["Compare your first month with later months", "Track hook quality, engagement, topic diversity and progress to goals", "Needs several months of imported history to be meaningful"]}
    available={[{ href: "/analysis", label: "Engagement over time" }, { href: "/library", label: "Import more history" }]} />;
}
