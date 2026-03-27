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
  CardDescription,
  CardContent,
  CardFooter,
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
      // Convert to 6-decimal integer (cUSD has 6 decimals)
      const value = BigInt(Math.round(parseFloat(amount) * 1e6));

      // Encrypt the amount client-side
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
        <CardTitle>Mint Confidential Tokens</CardTitle>
        <CardDescription>
          Encrypt an amount and mint confidential cUSD. The value is encrypted
          client-side before the transaction is sent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Amount (cUSD)</Label>
          <Input
            type="number"
            placeholder="e.g. 10000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!isConnected || loading}
          />
        </div>

        {mintTxHash && (
          <div className="rounded border bg-green-500/10 border-green-500/30 p-2 text-xs space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-green-500" />
              <span className="text-green-600 dark:text-green-400 font-medium">
                Tokens minted successfully
              </span>
            </div>
            <div className="font-mono text-[10px] text-muted-foreground break-all">
              tx: {mintTxHash}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          size="sm"
          onClick={handleMint}
          disabled={!isConnected || loading || !amount}
        >
          {loading ? "Minting..." : "Mint cUSD"}
        </Button>
      </CardFooter>
    </Card>
  );
}
