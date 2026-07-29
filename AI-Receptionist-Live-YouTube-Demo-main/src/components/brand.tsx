import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brand({
  href = "/",
  inverted = false,
  className,
}: {
  href?: string;
  inverted?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label="Switchboard home"
    >
      <span
        className={cn(
          "relative grid size-8 grid-cols-2 gap-0.5 rounded-[7px] border p-1 transition-transform group-hover:-rotate-3",
          inverted
            ? "border-white/20 bg-white text-slate-950"
            : "border-foreground/15 bg-foreground text-background",
        )}
        aria-hidden="true"
      >
        <span className="rounded-[2px] bg-current opacity-90" />
        <span className="rounded-[2px] border border-current opacity-45" />
        <span className="rounded-[2px] border border-current opacity-45" />
        <span className="rounded-[2px] bg-current opacity-90" />
      </span>
      <span
        className={cn(
          "font-heading text-[1.4rem] font-semibold tracking-[-0.035em]",
          inverted && "text-white",
        )}
      >
        Switchboard
      </span>
    </Link>
  );
}
