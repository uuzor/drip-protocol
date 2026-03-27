import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";

export default function Header() {
  return (
    <div>
      <div className="flex flex-row items-center justify-between px-4 py-2">
        <nav className="flex items-center gap-2">
          <Link to="/" className="text-sm font-semibold uppercase text-foreground hover:text-foreground/75">
            Selective Disclosure
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ModeToggle />
        </div>
      </div>
      <div className="border-b border-[#4e4e4e]" />
    </div>
  );
}
