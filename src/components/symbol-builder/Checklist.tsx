import { Circle, CircleCheck } from "lucide-react";

import type { PictureStatus } from "@/lib/symbols";
import { cn } from "@/lib/utils";

export function Checklist({ status }: { status: PictureStatus }) {
  const items = [
    { done: status.hasAllFour, label: "Triangle, square, circle and squiggle on the canvas" },
    { done: status.duplicateKind !== null, label: "Exactly one symbol duplicated (5 pieces)" },
    { done: status.arranged, label: "Shapes arranged into your own picture" },
  ];
  return (
    <section aria-labelledby="checklist-heading" className="rounded-2xl border bg-card p-4 shadow-soft">
      <h2 id="checklist-heading" className="mb-2 text-lg font-semibold">
        Your progress
      </h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-2.5 text-sm">
            {item.done ? (
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <span className={cn(item.done ? "text-foreground" : "text-muted-foreground")}>
              <span className="sr-only">{item.done ? "Done: " : "To do: "}</span>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}