import { ThemeHeroVisual } from "./openWorkspacePageThemeHero.js";
import { XingsiRelayLoginForm } from "./login/XingsiRelayLoginForm.js";

export type LoginCompleteReason = "oauth" | "apiKey" | "skip";
export function WelcomeScreen({
  onComplete,
}: {
  onComplete: (reason: LoginCompleteReason) => void | Promise<void>;
}) {
  return (
    <main className="relative flex h-full min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-6 text-foreground sm:px-6">
      <ThemeHeroVisual className="absolute inset-0" />
      <div className="pointer-events-none absolute left-0 top-0 right-0 z-10 flex h-12 w-full items-center [app-region:drag]" />
      <section className="relative z-10 w-full max-w-sm rounded-2xl border border-popover-border bg-background p-8 text-ui-base/relaxed shadow-md sm:p-10">
        <XingsiRelayLoginForm onSaved={() => onComplete("apiKey")} />
      </section>
    </main>
  );
}
