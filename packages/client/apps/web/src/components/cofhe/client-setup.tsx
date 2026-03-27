import { useState } from "react";
import { createPublicClient, createWalletClient, http, custom } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { Copy, Check, Wallet, Globe, Unplug } from "lucide-react";
import { Button } from "@client/ui/components/button";
import { cofheClient } from "@/stores/cofhe-client";
import { useCofheStore } from "@/stores/cofhe-store";

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}···${address.slice(-4)}`;
}

export function ClientSetup() {
  const { status, account, setStatus, setConnection, disconnect } =
    useCofheStore();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleConnect = async () => {
    setError(null);
    setStatus("connecting");

    try {
      if (!window.ethereum) {
        throw new Error("No wallet detected. Please install MetaMask.");
      }

      const tempWalletClient = createWalletClient({
        chain: arbitrumSepolia,
        transport: custom(window.ethereum),
      });

      const [addr] = await tempWalletClient.requestAddresses();
      await tempWalletClient.switchChain({ id: arbitrumSepolia.id });

      const publicClient = createPublicClient({
        chain: arbitrumSepolia,
        transport: http(),
      });

      const walletClient = createWalletClient({
        account: addr,
        chain: arbitrumSepolia,
        transport: custom(window.ethereum),
      });

      await cofheClient.connect(publicClient, walletClient);

      const chain = await publicClient.getChainId();
      setConnection(addr, chain);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
      setStatus("disconnected");
    }
  };

  const handleDisconnect = () => {
    cofheClient.disconnect();
    disconnect();
  };

  const handleCopy = () => {
    if (!account) return;
    navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (status === "connected" && account) {
    return (
      <div className="space-y-2">
        <div className="flex items-stretch overflow-hidden rounded-xl border border-accent/30 bg-accent/8 dark:bg-accent/5">
          {/* Account */}
          <div className="flex flex-1 items-center gap-3 px-4 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/20 dark:bg-accent/10">
              <Wallet className="size-4 text-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Account
              </p>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm font-semibold text-foreground">
                  {truncateAddress(account)}
                </span>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center justify-center rounded-md p-0.5 text-muted-foreground transition-[color] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Copy address"
                >
                  {copied ? (
                    <Check className="size-3.5 text-accent" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="my-2.5 w-px bg-foreground/10" />

          {/* Network */}
          <div className="flex flex-1 items-center gap-3 px-4 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/20 dark:bg-accent/10">
              <Globe className="size-4 text-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Network
              </p>
              <span className="text-sm font-semibold text-foreground">
                Arbitrum Sepolia
              </span>
            </div>
          </div>

          {/* Disconnect */}
          <div className="flex items-center pr-3">
            <button
              onClick={handleDisconnect}
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-[color,background-color] hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Disconnect wallet"
            >
              <Unplug className="size-4" />
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 rounded-xl border border-border/30 bg-card p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <Wallet className="size-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            Connect Wallet
          </p>
          <p className="text-xs text-muted-foreground">
            Link your wallet to start using confidential tokens
          </p>
        </div>
        <Button
          variant="fhenix-cta"
          size="sm"
          onClick={handleConnect}
          disabled={status === "connecting"}
        >
          {status === "connecting" ? "Connecting…" : "Connect"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
}
