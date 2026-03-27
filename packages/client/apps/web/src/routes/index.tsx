import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClientSetup } from "@/components/cofhe/client-setup";
import { Mint } from "@/components/cofhe/mint";
import { TokenHolder } from "@/components/cofhe/token-holder";
import { Verifier } from "@/components/cofhe/verifier";
import { ModeToggle } from "@/components/mode-toggle";
import { useCofheStore } from "@/stores/cofhe-store";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

type Tab = "holder" | "verifier";

function getTabFromUrl(): Tab {
  const params = new URLSearchParams(window.location.search);
  return params.get("tab") === "verifier" ? "verifier" : "holder";
}

function HomeComponent() {
  const { status } = useCofheStore();
  const [tab, setTabState] = useState<Tab>(getTabFromUrl);
  const isConnected = status === "connected";

  const setTab = (t: Tab) => {
    setTabState(t);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    window.history.replaceState({}, "", url);
  };

  useEffect(() => {
    const handlePopState = () => setTabState(getTabFromUrl());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <div className="min-h-svh px-4 py-6 sm:px-6 lg:px-8">
      {/* Header: title + theme toggle */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold uppercase text-foreground lg:text-3xl">
            Selective Disclosure
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Privacy-preserving compliance with FHE
          </p>
        </div>
        <ModeToggle />
      </div>

      <div className="border-b border-[#4e4e4e] mb-6" />

      {/* Responsive layout */}
      {isConnected ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr] xl:grid-cols-[1fr_2fr]">
          {/* Left column: wallet + mint */}
          <div className="flex flex-col gap-4">
            <ClientSetup />
            <Mint />
          </div>

          {/* Right column: tabs + content */}
          <div className="flex flex-col gap-4">
            {/* Tab bar */}
            <div className="flex items-center gap-2" role="tablist">
              <button
                role="tab"
                aria-selected={tab === "holder"}
                className={`text-sm font-semibold uppercase transition-[color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  tab === "holder"
                    ? "text-foreground underline underline-offset-4"
                    : "text-foreground/50 hover:text-foreground/75"
                }`}
                onClick={() => setTab("holder")}
              >
                Token Holder
              </button>
              <span className="text-sm font-semibold text-muted-foreground">
                |
              </span>
              <button
                role="tab"
                aria-selected={tab === "verifier"}
                className={`text-sm font-semibold uppercase transition-[color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  tab === "verifier"
                    ? "text-foreground underline underline-offset-4"
                    : "text-foreground/50 hover:text-foreground/75"
                }`}
                onClick={() => setTab("verifier")}
              >
                Compliance Verifier
              </button>
            </div>

            <div role="tabpanel">
              {tab === "holder" ? <TokenHolder /> : <Verifier />}
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-lg">
          <ClientSetup />
        </div>
      )}
    </div>
  );
}
