import { createElement } from "react";
import { AD_HOUR_STEPS, adHourCommand } from "./ad-hour.ts";
import { Shell } from "./builder-shell.ts";

export function AdHourSteps(props: { subnet: string; dc: string; user: string; domain: string; password: string; hash: string; share: string; examOn: boolean }) {
  return createElement(
    "div",
    { className: "flex flex-col gap-3" },
    AD_HOUR_STEPS.map((step) => {
      const plan = adHourCommand(step.id, props);
      return createElement(Shell, {
        key: step.id,
        title: step.title,
        blurb: `${step.look} Alive: ${step.alive} Dead: ${step.dead}`,
        command: "command" in plan ? plan.command : "",
        why: "command" in plan ? plan.why : "",
        error: "error" in plan ? plan.error : "",
      });
    }),
  );
}
