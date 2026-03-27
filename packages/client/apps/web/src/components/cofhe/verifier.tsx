import { useState } from "react";
import { FheTypes } from "@cofhe/sdk";
import { FileKey, Search, Check } from "lucide-react";
import { Button } from "@client/ui/components/button";
import { Input } from "@client/ui/components/input";
import { Label } from "@client/ui/components/label";
import { cofheClient } from "@/stores/cofhe-client";
import { useCofheStore } from "@/stores/cofhe-store";
import { MOCK_ERC7984_TOKEN } from "@/contracts/MockERC7984Token";

interface VerifiedResult {
  holder: string;
  balance: string;
  permitHash: string;
  verifiedAt: string;
}

export function Verifier() {
  const { status, bumpPermitVersion } = useCofheStore();

  const [acpJson, setAcpJson] = useState("");
  const [holderAddress, setHolderAddress] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);
  const [result, setResult] = useState<VerifiedResult | null>(null);

  const isConnected = status === "connected";

  const handleImportAcp = async () => {
    setError(null);
    setLoading("import");
    try {
      if (!acpJson.trim()) throw new Error("Paste the ACP JSON");
      const parsed = JSON.parse(acpJson);
      await cofheClient.permits.importShared(parsed);
      bumpPermitVersion();
      setImported(true);

      if (parsed.issuer) {
        setHolderAddress(parsed.issuer);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(null);
    }
  };

  const handleVerify = async () => {
    if (!holderAddress) return;
    setError(null);
    setResult(null);
    setLoading("verify");
    try {
      const publicClient = cofheClient.connection.publicClient;
      if (!publicClient) throw new Error("Not connected");

      const ctHash = await publicClient.readContract({
        address: MOCK_ERC7984_TOKEN.address,
        abi: MOCK_ERC7984_TOKEN.abi,
        functionName: "confidentialBalanceOf",
        args: [holderAddress as `0x${string}`],
      });

      const plaintext = await cofheClient
        .decryptForView(ctHash as string, FheTypes.Uint64)
        .execute();

      const raw = BigInt(String(plaintext));
      const formatted = (Number(raw) / 1e6).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      });

      const activePermit = cofheClient.permits.getActivePermit();

      setResult({
        holder: holderAddress,
        balance: formatted,
        permitHash: activePermit?.hash ?? "unknown",
        verifiedAt:
          new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "UTC",
          }).format(new Date()) + " UTC",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Import ACP */}
      <div className="rounded-xl border border-border/30 bg-card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/20 dark:bg-accent/10">
            <FileKey className="size-4 text-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Paste ACP</p>
            <p className="text-xs text-muted-foreground">
              Paste the Access Control Permit from the token holder
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            ACP JSON
          </Label>
          <textarea
            placeholder="Paste the ACP JSON here…"
            value={acpJson}
            onChange={(e) => {
              setAcpJson(e.target.value);
              setImported(false);
            }}
            rows={5}
            className="w-full rounded-lg border border-border/30 bg-secondary p-3 font-mono text-xs text-foreground resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {imported ? (
          <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/8 dark:bg-accent/5 px-3 py-2">
            <Check className="size-3.5 text-accent" />
            <span className="text-xs font-medium text-foreground">
              ACP imported and activated
            </span>
          </div>
        ) : (
          <Button
            variant="fhenix-cta"
            size="sm"
            onClick={handleImportAcp}
            disabled={!isConnected || !acpJson.trim() || loading === "import"}
          >
            {loading === "import" ? "Importing…" : "Import ACP"}
          </Button>
        )}
      </div>

      {/* Verify Balance */}
      <div className="rounded-xl border border-border/30 bg-card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/20 dark:bg-accent/10">
            <Search className="size-4 text-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Verify Balance
            </p>
            <p className="text-xs text-muted-foreground">
              Decrypt the holder's encrypted balance using the ACP
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            name="holder-address"
            autoComplete="off"
            spellCheck={false}
            placeholder="Holder address (0x…)"
            value={holderAddress}
            onChange={(e) => setHolderAddress(e.target.value)}
            disabled={!isConnected || loading === "verify"}
            className="h-9 flex-1 rounded-lg border-border/30 bg-secondary px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-accent"
          />
          <Button
            variant="fhenix-cta"
            size="sm"
            className="h-9 px-4"
            onClick={handleVerify}
            disabled={
              !isConnected ||
              !imported ||
              !holderAddress ||
              loading === "verify"
            }
          >
            {loading === "verify" ? "Verifying…" : "Verify"}
          </Button>
        </div>

        {result ? (
          <div className="rounded-lg border border-accent/30 bg-accent/8 dark:bg-accent/5 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Verified Encrypted Balance
            </p>
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs">
              <span className="text-muted-foreground">Holder</span>
              <span className="text-foreground break-all">
                {result.holder}
              </span>
              <span className="text-muted-foreground">Asset</span>
              <span className="text-foreground">cUSD</span>
              <span className="text-muted-foreground">Balance</span>
              <span className="text-foreground font-semibold">
                {result.balance} cUSD
              </span>
              <span className="text-muted-foreground">Permit</span>
              <span className="text-foreground break-all">
                {result.permitHash}
              </span>
              <span className="text-muted-foreground">Verified</span>
              <span className="text-foreground">{result.verifiedAt}</span>
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
}
