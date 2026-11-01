import { PlannedFeature } from "@/components/planned";

export default function Page() {
  return <PlannedFeature title="Content Calendar" description="Plan, schedule and track what you publish."
    needs={["Generate a calendar from your performance history and goals", "Assign dates to saved ideas and drafts", "Track completed posts"]}
    available={[{ href: "/ideas", label: "Save ideas in Idea Lab" }, { href: "/studio", label: "Draft Studio" }]} />;
}
