import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClientSetup } from "@/components/cofhe/client-setup";
import { Mint } from "@/components/cofhe/mint";
import { TokenHolder } from "@/components/cofhe/token-holder";
import { Verifier } from "@/components/cofhe/verifier";
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
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Selective Disclosure Demo</h1>
        <p className="text-xs text-muted-foreground">
          Privacy-preserving compliance with FHE. Shield tokens, control who
          sees your balance, and verify without exposing the full wallet.
        </p>
      </div>

      <div className="grid gap-4">
        <ClientSetup />

        {isConnected && (
          <>
            <Mint />

            {/* Tab navigation */}
            <div className="flex border-b" role="tablist">
              <button
                role="tab"
                aria-selected={tab === "holder"}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-[color,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  tab === "holder"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTab("holder")}
              >
                Token Holder
              </button>
              <button
                role="tab"
                aria-selected={tab === "verifier"}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-[color,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  tab === "verifier"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTab("verifier")}
              >
                Compliance Verifier
              </button>
            </div>

            <div role="tabpanel">
              {tab === "holder" ? <TokenHolder /> : <Verifier />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
