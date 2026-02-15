import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChatLayoutProps {
  sidebar: ReactNode;
  chat: ReactNode;
  className?: string;
}

export function ChatLayout({ sidebar, chat, className }: ChatLayoutProps) {
  return (
    <div className={cn("flex h-screen w-full overflow-hidden bg-background", className)}>
      <aside className="hidden md:flex w-80 flex-col border-r bg-muted/30">
        {sidebar}
      </aside>
      <main className="flex-1 flex flex-col h-full min-w-0 bg-background relative">
        {chat}
      </main>
    </div>
  );
}
