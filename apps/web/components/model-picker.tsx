"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatModelOption } from "@/lib/api";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChevronDown } from "@hugeicons/core-free-icons";

type Props = {
  models: ChatModelOption[];
  value: string | null;
  onChange: (modelId: string) => void;
  disabled?: boolean;
};

export function ModelPicker({ models, value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected =
    models.find((model) => model.id === value) ??
    models.find((model) => model.available) ??
    null;

  const hovered =
    models.find((model) => model.id === hoveredId) ??
    selected ??
    models[0] ??
    null;

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (models.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className="text-muted-foreground hover:text-foreground h-7 min-w-24 justify-between gap-2 rounded-full px-2 font-normal md:text-sm"
      >
        <span className="truncate">
          {selected ? (
            <span className="text-foreground">{selected.label}</span>
          ) : (
            "Select model"
          )}
        </span>
        <span
          aria-hidden
          className={cn(
            "text-muted-foreground shrink-0 text-[0.625rem] transition-transform",
            open && "rotate-180",
          )}
        >
          <HugeiconsIcon icon={ChevronDown} strokeWidth={2} />
        </span>
      </Button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-1 flex items-start gap-1">
          <div
            role="listbox"
            aria-label="Models"
            className="border-border bg-popover text-popover-foreground w-56 overflow-hidden rounded-lg border shadow-lg"
          >
            <div className="max-h-64 overflow-y-auto py-1">
              {models.map((model) => {
                const isSelected = model.id === selected?.id;
                const isDisabled = !model.available;

                return (
                  <button
                    key={model.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={isDisabled}
                    disabled={isDisabled}
                    onMouseEnter={() => setHoveredId(model.id)}
                    onFocus={() => setHoveredId(model.id)}
                    onClick={() => {
                      if (isDisabled) return;
                      onChange(model.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
                      isDisabled
                        ? "text-muted-foreground/50 cursor-not-allowed"
                        : "hover:bg-muted/60 cursor-pointer",
                      isSelected && !isDisabled && "bg-muted/40",
                    )}
                  >
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate",
                        isDisabled ? "opacity-60" : "text-foreground",
                      )}
                    >
                      {model.label}
                    </span>
                    <span className="text-muted-foreground shrink-0">
                      {model.hint}
                    </span>
                    {model.disabledReason === "pro" && (
                      <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-[0.625rem] font-medium tracking-wide uppercase">
                        Pro
                      </span>
                    )}
                    {isSelected && !isDisabled && (
                      <span
                        aria-hidden
                        className="text-foreground shrink-0 text-xs"
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {hovered && (
            <div className="border-border bg-popover text-popover-foreground hidden w-52 shrink-0 rounded-lg border p-3 shadow-lg sm:block">
              <p className="text-foreground text-xs font-medium">
                {hovered.label}{" "}
                <span className="text-muted-foreground font-normal">
                  ({hovered.hint})
                </span>
              </p>
              <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                {hovered.description}
              </p>
              {hovered.disabledReason === "pro" && (
                <p className="text-muted-foreground/80 mt-2 text-[0.625rem]">
                  Upgrade to Pro to use this model.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
