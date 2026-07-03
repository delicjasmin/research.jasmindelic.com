"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ComputerIcon,
  Moon02Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start"
        disabled
      >
        <HugeiconsIcon
          icon={Sun03Icon}
          strokeWidth={2}
          className="mr-2 size-4"
        />
        Theme
      </Button>
    );
  }

  const icon =
    theme === "dark"
      ? Moon02Icon
      : theme === "light"
        ? Sun03Icon
        : ComputerIcon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <HugeiconsIcon icon={icon} strokeWidth={2} className="mr-2 size-4" />
          Theme
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-36">
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <HugeiconsIcon
              icon={Sun03Icon}
              strokeWidth={2}
              className="mr-2 size-4"
            />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <HugeiconsIcon
              icon={Moon02Icon}
              strokeWidth={2}
              className="mr-2 size-4"
            />
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <HugeiconsIcon
              icon={ComputerIcon}
              strokeWidth={2}
              className="mr-2 size-4"
            />
            System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
