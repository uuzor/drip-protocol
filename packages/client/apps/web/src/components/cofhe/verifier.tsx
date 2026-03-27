import { useState } from "react";
import { FheTypes } from "@cofhe/sdk";
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
        verifiedAt: new Intl.DateTimeFormat(undefined, {
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Paste ACP</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Paste the Access Control Permit JSON received from the token holder.
          </p>
          <div className="space-y-1.5">
            <Label className="text-sm text-foreground">ACP JSON</Label>
            <textarea
              placeholder="Paste the ACP JSON here…"
              value={acpJson}
              onChange={(e) => {
                setAcpJson(e.target.value);
                setImported(false);
              }}
              rows={6}
              className="w-full border-b border-l border-[#5f6368] bg-secondary p-2 font-mono text-xs text-foreground resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          {imported ? (
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#8de8ef]" />
              <span className="text-sm text-foreground">
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
        </CardContent>
      </Card>

      {/* Verify Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Verify Balance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Use the imported ACP to read and decrypt the holder's encrypted
            balance.
          </p>
          <div className="space-y-1.5">
            <Label className="text-sm text-foreground">Holder Address</Label>
            <Input
              name="holder-address"
              autoComplete="off"
              spellCheck={false}
              placeholder="0x…"
              value={holderAddress}
              onChange={(e) => setHolderAddress(e.target.value)}
              disabled={!isConnected || loading === "verify"}
              className="h-[30px] border-[#5f6368] bg-secondary px-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <Button
            variant="fhenix-cta"
            size="sm"
            onClick={handleVerify}
            disabled={
              !isConnected || !imported || !holderAddress || loading === "verify"
            }
          >
            {loading === "verify" ? "Verifying…" : "Verify Balance"}
          </Button>

          {result ? (
            <div className="border-b border-l border-[#8de8ef] bg-[#8de8ef]/5 p-3 font-mono text-xs text-foreground space-y-1.5">
              <div className="font-semibold text-sm text-foreground mb-2">
                Verified Encrypted Balance
              </div>
              <div>
                <span className="text-muted-foreground">Holder:    </span>
                {result.holder}
              </div>
              <div>
                <span className="text-muted-foreground">Asset:     </span>
                cUSD
              </div>
              <div>
                <span className="text-muted-foreground">Balance:   </span>
                <span className="font-semibold">{result.balance} cUSD</span>
              </div>
              <div>
                <span className="text-muted-foreground">Permit ID: </span>
                <span className="break-all">{result.permitHash}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Verified:  </span>
                {result.verifiedAt}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {error ? (
        <div className="border-b border-l border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
}
