import { cn } from "../lib/utils.js";
import logo from "../../assets/xingji-logo.png";
export function ZCodeAboutLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-3 shrink-0", className)}>
      <img src={logo} alt="" className="size-10" />
      <span className="text-ui-xl font-semibold text-foreground">星际中转站</span>
    </div>
  );
}
