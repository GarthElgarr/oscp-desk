import { createFileRoute } from "@tanstack/react-router";
import { MethodDesk } from "@/components/method-desk";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <MethodDesk />;
}
