import { useState } from "react";
import { FheTypes } from "@cofhe/sdk";
import { PermitUtils } from "@cofhe/sdk/permits";
import { Button } from "@client/ui/components/button";
import { Input } from "@client/ui/components/input";
import { Label } from "@client/ui/components/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@client/ui/components/card";
import { cofheClient } from "@/stores/cofhe-client";
import { useCofheStore } from "@/stores/cofhe-store";
import { MOCK_ERC7984_TOKEN } from "@/contracts/MockERC7984Token";

export function TokenHolder() {
  const { status, account, balanceCtHash, decryptedBalance, setBalanceCtHash, setDecryptedBalance, bumpPermitVersion } =
    useCofheStore();

  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ACP generation
  const [verifierAddress, setVerifierAddress] = useState("");
  const [exportedAcp, setExportedAcp] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isConnected = status === "connected";

  const handleCreatePermit = async () => {
    setError(null);
    setLoading("permit");
    try {
      const issuer = cofheClient.connection.account!;
      await cofheClient.permits.getOrCreateSelfPermit(undefined, undefined, {
        issuer,
        name: "Self permit",
      });
      bumpPermitVersion();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create permit");
    } finally {
      setLoading(null);
    }
  };

  const handleFetchBalance = async () => {
    if (!account) return;
    setError(null);
    setLoading("balance");
    try {
      const publicClient = cofheClient.connection.publicClient;
      if (!publicClient) throw new Error("Not connected");

      const ctHash = await publicClient.readContract({
        address: MOCK_ERC7984_TOKEN.address,
        abi: MOCK_ERC7984_TOKEN.abi,
        functionName: "confidentialBalanceOf",
        args: [account as `0x${string}`],
      });

      setBalanceCtHash(ctHash as string);
      setDecryptedBalance(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch balance");
    } finally {
      setLoading(null);
    }
  };

  const handleDecryptBalance = async () => {
    if (!balanceCtHash) return;
    setError(null);
    setLoading("decrypt");
    try {
      const plaintext = await cofheClient
        .decryptForView(balanceCtHash, FheTypes.Uint64)
        .execute();

      const raw = BigInt(String(plaintext));
      const formatted = (Number(raw) / 1e6).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      });
      setDecryptedBalance(formatted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decryption failed");
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateAcp = async () => {
    if (!verifierAddress) return;
    setError(null);
    setExportedAcp(null);
    setLoading("acp");
    try {
      const issuer = cofheClient.connection.account!;
      const permit = await cofheClient.permits.createSharing({
        issuer,
        recipient: verifierAddress,
        name: `ACP → ${verifierAddress.slice(0, 8)}…`,
      });
      bumpPermitVersion();
      setExportedAcp(JSON.stringify(PermitUtils.export(permit), null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate ACP");
    } finally {
      setLoading(null);
    }
  };

  const handleCopy = () => {
    if (!exportedAcp) return;
    navigator.clipboard.writeText(exportedAcp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  let hasActivePermit = false;
  try {
    hasActivePermit = !!cofheClient.permits.getActivePermit();
  } catch {
    /* not connected */
  }

  return (
    <div className="space-y-4">
      {/* Self Permit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permit</CardTitle>
          <CardDescription>
            Create a self-permit to decrypt your own encrypted balance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasActivePermit ? (
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground">
                Active permit ready
              </span>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={handleCreatePermit}
              disabled={!isConnected || loading === "permit"}
            >
              {loading === "permit" ? "Creating…" : "Create Self Permit"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Encrypted Balance</CardTitle>
          <CardDescription>
            Read your confidential balance from the contract and decrypt it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Confidential Balance
              </span>
              <span className="font-mono text-sm font-medium">
                {decryptedBalance
                  ? `${decryptedBalance} cUSD`
                  : balanceCtHash
                    ? "Encrypted"
                    : "—"}
              </span>
            </div>
            {balanceCtHash && !decryptedBalance && (
              <div className="font-mono text-[10px] text-muted-foreground break-all">
                ctHash: {balanceCtHash}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleFetchBalance}
              disabled={!isConnected || loading === "balance"}
            >
              {loading === "balance" ? "Fetching…" : "Fetch Balance"}
            </Button>
            {balanceCtHash && !decryptedBalance && (
              <Button
                size="sm"
                onClick={handleDecryptBalance}
                disabled={!hasActivePermit || loading === "decrypt"}
              >
                {loading === "decrypt" ? "Decrypting…" : "Decrypt"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Issue ACP */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Issue Compliance ACP</CardTitle>
          <CardDescription>
            Generate an Access Control Permit for a verifier to view your
            encrypted balance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Verifier Wallet Address</Label>
            <Input
              name="verifier-address"
              autoComplete="off"
              spellCheck={false}
              placeholder="0x…"
              value={verifierAddress}
              onChange={(e) => setVerifierAddress(e.target.value)}
              disabled={!isConnected || loading === "acp"}
            />
          </div>

          <Button
            size="sm"
            onClick={handleGenerateAcp}
            disabled={!isConnected || !verifierAddress || loading === "acp"}
          >
            {loading === "acp" ? "Generating…" : "Generate ACP"}
          </Button>

          {exportedAcp && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Share this permit with your Compliance Verifier to grant them a
                verified view of your encrypted balance.
              </p>
              <textarea
                readOnly
                value={exportedAcp}
                rows={8}
                className="w-full rounded border bg-muted/30 p-2 font-mono text-[10px] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? "Copied!" : "Copy ACP"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
