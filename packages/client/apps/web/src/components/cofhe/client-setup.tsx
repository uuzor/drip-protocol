import { useState } from "react";
import { createPublicClient, createWalletClient, http, custom } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { Button } from "@client/ui/components/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@client/ui/components/card";
import { cofheClient } from "@/stores/cofhe-client";
import { useCofheStore } from "@/stores/cofhe-store";

export function ClientSetup() {
  const { status, account, chainId, setStatus, setConnection, disconnect } =
    useCofheStore();
  const [error, setError] = useState<string | null>(null);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Wallet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {status === "connected" ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#8de8ef]" />
              <span className="text-sm text-foreground">Connected</span>
            </div>
            <div className="border-b border-l border-[#5f6368] bg-secondary p-2 font-mono text-xs break-all">
              <div>
                <span className="text-muted-foreground">Account: </span>
                {account}
              </div>
              <div>
                <span className="text-muted-foreground">Chain ID: </span>
                {chainId}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#5f6368]" />
            <span className="text-sm text-muted-foreground">Disconnected</span>
          </div>
        )}
        {error ? (
          <div className="border-b border-l border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}
        <div>
          {status === "connected" ? (
            <Button variant="fhenix" size="sm" onClick={handleDisconnect}>
              Disconnect
            </Button>
          ) : (
            <Button
              variant="fhenix-cta"
              size="sm"
              onClick={handleConnect}
              disabled={status === "connecting"}
            >
              {status === "connecting" ? "Connecting…" : "Connect Wallet"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
