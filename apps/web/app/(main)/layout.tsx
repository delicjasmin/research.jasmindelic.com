"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AppSidebar, SidebarContent } from "@/components/app-sidebar";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon } from "@hugeicons/core-free-icons";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-border flex items-center gap-3 border-b px-3 py-2 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Open menu">
                <HugeiconsIcon icon={Menu01Icon} strokeWidth={2} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0" showCloseButton>
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarContent
                className="h-full"
                onNavigate={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <Link href="/" className="flex min-w-0 items-center gap-2">
            <Image src="/logo.png" alt="Research" width={24} height={24} />
            <span className="truncate text-sm font-semibold">AI Research</span>
          </Link>
        </header>

        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
