import { useState } from "react";
import { Encryptable } from "@cofhe/sdk";
import { arbitrumSepolia } from "viem/chains";
import { Button } from "@client/ui/components/button";
import { Input } from "@client/ui/components/input";
import { Label } from "@client/ui/components/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@client/ui/components/card";
import { cofheClient } from "@/stores/cofhe-client";
import { useCofheStore } from "@/stores/cofhe-store";
import { MOCK_ERC7984_TOKEN } from "@/contracts/MockERC7984Token";

export function Mint() {
  const { status, account, mintTxHash, setMintTxHash } = useCofheStore();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConnected = status === "connected";

  const handleMint = async () => {
    if (!account) return;
    setError(null);
    setLoading(true);

    try {
      const value = BigInt(Math.round(parseFloat(amount) * 1e6));

      const [encrypted] = await cofheClient
        .encryptInputs([Encryptable.uint64(value)])
        .execute();

      const walletClient = cofheClient.connection.walletClient;
      const publicClient = cofheClient.connection.publicClient;

      if (!walletClient || !publicClient) {
        throw new Error("Wallet not connected");
      }

      const txHash = await walletClient.writeContract({
        chain: arbitrumSepolia,
        account: account as `0x${string}`,
        address: MOCK_ERC7984_TOKEN.address,
        abi: MOCK_ERC7984_TOKEN.abi,
        functionName: "confidentialMint",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        args: [account as `0x${string}`, encrypted as any],
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });
      setMintTxHash(txHash);
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Minting failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Mint Confidential Tokens
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Encrypt an amount and mint confidential cUSD.
        </p>
        <div className="space-y-1.5">
          <Label className="text-sm text-foreground">Amount (cUSD)</Label>
          <Input
            type="number"
            name="mint-amount"
            autoComplete="off"
            placeholder="e.g. 10,000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!isConnected || loading}
            className="h-[30px] border-[#5f6368] bg-secondary px-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {mintTxHash ? (
          <div className="border-b border-l border-[#8de8ef] bg-[#8de8ef]/10 p-2 text-xs space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#8de8ef]" />
              <span className="text-foreground font-medium">
                Tokens minted successfully
              </span>
            </div>
            <div className="font-mono text-[10px] text-muted-foreground break-all">
              tx: {mintTxHash}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="border-b border-l border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}

        <Button
          variant="fhenix-cta"
          size="sm"
          onClick={handleMint}
          disabled={!isConnected || loading || !amount}
        >
          {loading ? "Minting…" : "Mint cUSD"}
        </Button>
      </CardContent>
    </Card>
  );
}
