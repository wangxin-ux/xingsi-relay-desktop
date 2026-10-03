import { ChevronDown, PencilRuler } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu.js";
import { useZCodeStore } from "@/store/StoreProvider.js";
import { normalizeInterfaceMode } from "@/lib/interfaceMode.js";
import { useZCodeIntl } from "@/i18n/IntlProvider.js";

export function XingsiInterfaceModeSwitch({ disabled }: { disabled?: boolean }) {
  const { intl } = useZCodeIntl();
  const mode = useZCodeStore((state) => state.interfaceMode);
  const setMode = useZCodeStore((state) => state.setInterfaceMode);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="gap-1.5 px-2 text-foreground-subtle"
          aria-label={intl.formatMessage({ id: "settings.interfaceMode" })}
        >
          <PencilRuler className="size-4" />
          <span>
            {intl.formatMessage({
              id:
                mode === "office"
                  ? "settings.interfaceMode.office"
                  : "settings.interfaceMode.coding",
            })}
          </span>
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(value) => setMode(normalizeInterfaceMode(value))}
        >
          <DropdownMenuRadioItem value="coding">
            {intl.formatMessage({ id: "settings.interfaceMode.coding" })}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="office">
            {intl.formatMessage({ id: "settings.interfaceMode.office" })}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
