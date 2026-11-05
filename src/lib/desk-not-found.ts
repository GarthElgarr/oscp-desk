import { createElement } from "react";

export const NOT_FOUND_TEXT = "That page is not on this desk.";

export function DeskNotFound() {
  return createElement(
    "main",
    { className: "mx-auto max-w-lg px-6 py-16" },
    createElement("h1", { className: "text-xl" }, NOT_FOUND_TEXT),
    createElement("p", { className: "mt-3" }, createElement("a", { href: "/" }, "Back to the desk")),
  );
}
