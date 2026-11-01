import { PlannedFeature } from "@/components/planned";

export default function Page() {
  return <PlannedFeature title="Experiments" description="Test content approaches and compare observed results."
    needs={["Define an experiment (e.g. story hook vs. educational hook, short vs. long)", "Tag published posts to each variant", "Compare results as observed patterns — never presented as proof of causation"]}
    available={[{ href: "/analysis", label: "Content Analysis" }, { href: "/studio", label: "Draft Studio" }]} />;
}
