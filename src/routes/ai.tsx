import { createFileRoute } from "@tanstack/react-router";
import { AiDesk } from "@/components/ai-desk";

export const Route = createFileRoute("/ai")({ component: AiPage });

function AiPage() {
  return <AiDesk />;
}
