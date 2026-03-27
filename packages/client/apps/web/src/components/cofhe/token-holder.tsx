import { useState } from "react";
import { FheTypes } from "@cofhe/sdk";
import { PermitUtils, type Permit } from "@cofhe/sdk/permits";
import { Button } from "@client/ui/components/button";
import { Input } from "@client/ui/components/input";
import { Label } from "@client/ui/components/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@client/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@client/ui/components/dialog";
import { cofheClient } from "@/stores/cofhe-client";
import { useCofheStore } from "@/stores/cofhe-store";
import { MOCK_ERC7984_TOKEN } from "@/contracts/MockERC7984Token";

type ModalMode = "self" | "sharing" | "import" | "export";

function expirationDefault(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 16);
}

export function TokenHolder() {
  const {
    status,
    account,
    balanceCtHash,
    decryptedBalance,
    setBalanceCtHash,
    setDecryptedBalance,
    bumpPermitVersion,
  } = useCofheStore();

  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Permit modal state
  const [refreshKey, setRefreshKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("self");
  const [permitName, setPermitName] = useState("");
  const [recipient, setRecipient] = useState("");
  const [expiration, setExpiration] = useState(expirationDefault);
  const [importData, setImportData] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [exportedJson, setExportedJson] = useState<string | null>(null);

  const isConnected = status === "connected";

  // Read permits from SDK
  void refreshKey;
  let allPermits: Record<string, Permit> = {};
  let activePermitHash: string | null = null;
  try {
    allPermits = cofheClient.permits.getPermits() ?? {};
    activePermitHash = cofheClient.permits.getActivePermit()?.hash ?? null;
  } catch {
    /* not connected */
  }
  const entries = Object.entries(allPermits);
  const hasActivePermit = !!activePermitHash;

  const refresh = () => {
    setRefreshKey((k) => k + 1);
    bumpPermitVersion();
  };

  const openModal = (mode: ModalMode) => {
    setPermitName("");
    setRecipient("");
    setExpiration(expirationDefault());
    setImportData("");
    setModalError(null);
    setExportedJson(null);
    setModalMode(mode);
    setModalOpen(true);
  };

  const handleModalAction = async () => {
    setModalError(null);
    setModalLoading(true);
    try {
      const exp = Math.floor(new Date(expiration).getTime() / 1000);
      const issuer = cofheClient.connection.account!;

      if (modalMode === "self") {
        await cofheClient.permits.getOrCreateSelfPermit(undefined, undefined, {
          issuer,
          name: permitName || undefined,
          expiration: exp,
        });
        refresh();
        setModalOpen(false);
      } else if (modalMode === "sharing") {
        if (!recipient) throw new Error("Recipient address is required");
        const permit = await cofheClient.permits.createSharing({
          issuer,
          recipient,
          name: permitName || `ACP → ${recipient.slice(0, 8)}…`,
          expiration: exp,
        });
        refresh();
        setExportedJson(JSON.stringify(PermitUtils.export(permit), null, 2));
        setModalMode("export");
      } else if (modalMode === "import") {
        if (!importData) throw new Error("Paste the exported permit JSON");
        await cofheClient.permits.importShared(JSON.parse(importData));
        refresh();
        setModalOpen(false);
      }
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setModalLoading(false);
    }
  };

  const getName = (p: Permit | undefined) => p?.name ?? "Unnamed";

  // Balance handlers
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

  return (
    <>
      <div className="space-y-4">
        {/* Permits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Permits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activePermitHash ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#8de8ef]" />
                  <span className="text-sm text-foreground">
                    Active: {getName(allPermits[activePermitHash])}
                  </span>
                </div>
                <div className="border-b border-l border-[#4e4e4e] bg-secondary p-2 font-mono text-[10px] text-muted-foreground break-all">
                  {activePermitHash}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-[#5f6368]" />
                <span className="text-sm text-muted-foreground">
                  No active permit
                </span>
              </div>
            )}

            {entries.length > 0 ? (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-foreground">
                  All Permits ({entries.length})
                </span>
                {entries.map(([hash, permit]) => (
                  <div
                    key={hash}
                    className="flex items-center justify-between gap-2 border-b border-l border-[#4e4e4e] bg-secondary p-2"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-medium text-foreground truncate block">
                        {getName(permit)}
                        {activePermitHash === hash ? (
                          <span className="ml-1.5 bg-[#8de8ef]/20 px-1 py-0.5 text-[10px] text-foreground">
                            active
                          </span>
                        ) : null}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground truncate block">
                        {hash}
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {activePermitHash !== hash ? (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            cofheClient.permits.selectActivePermit(hash);
                            refresh();
                          }}
                        >
                          Activate
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => {
                          try {
                            const exported = PermitUtils.export(permit);
                            setExportedJson(JSON.stringify(exported, null, 2));
                            setModalMode("export");
                            setModalOpen(true);
                          } catch (err) {
                            setError(
                              err instanceof Error ? err.message : "Export failed",
                            );
                          }
                        }}
                      >
                        Export
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => {
                          cofheClient.permits.removePermit(hash);
                          refresh();
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="fhenix-cta"
                size="sm"
                onClick={() => openModal("self")}
                disabled={!isConnected}
              >
                Create Self Permit
              </Button>
              <Button
                variant="fhenix"
                size="sm"
                onClick={() => openModal("sharing")}
                disabled={!isConnected}
              >
                Share Permit
              </Button>
              <Button
                variant="fhenix"
                size="sm"
                onClick={() => openModal("import")}
                disabled={!isConnected}
              >
                Import Permit
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Balance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Encrypted Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="border-b border-l border-[#4e4e4e] bg-secondary p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Confidential Balance
                </span>
                <span className="font-semibold text-lg text-foreground">
                  {decryptedBalance
                    ? `${decryptedBalance} cUSD`
                    : balanceCtHash
                      ? "Encrypted"
                      : "—"}
                </span>
              </div>
              {balanceCtHash && !decryptedBalance ? (
                <div className="font-mono text-[10px] text-muted-foreground break-all">
                  ctHash: {balanceCtHash}
                </div>
              ) : null}
            </div>

            <div className="flex gap-2">
              <Button
                variant="fhenix"
                size="sm"
                onClick={handleFetchBalance}
                disabled={!isConnected || loading === "balance"}
              >
                {loading === "balance" ? "Fetching…" : "Fetch Balance"}
              </Button>
              {balanceCtHash && !decryptedBalance ? (
                <Button
                  variant="fhenix-cta"
                  size="sm"
                  onClick={handleDecryptBalance}
                  disabled={!hasActivePermit || loading === "decrypt"}
                >
                  {loading === "decrypt" ? "Decrypting…" : "Decrypt"}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {error ? (
          <div className="border-b border-l border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}
      </div>

      {/* Permit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md border-b border-l border-[#4e4e4e] bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">
              {modalMode === "self" && "Create Self Permit"}
              {modalMode === "sharing" && "Create Sharing Permit"}
              {modalMode === "import" && "Import Shared Permit"}
              {modalMode === "export" && "Exported Permit"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {modalMode === "self" &&
                "Decrypt your own on-chain encrypted data."}
              {modalMode === "sharing" &&
                "Share decryption access with another address."}
              {modalMode === "export" &&
                "Share this JSON with the recipient."}
              {modalMode === "import" &&
                "Paste the permit JSON from the issuer."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {modalMode === "export" && exportedJson ? (
              <div className="space-y-1.5">
                <textarea
                  readOnly
                  value={exportedJson}
                  rows={8}
                  className="w-full border-b border-l border-[#4e4e4e] bg-secondary p-2 font-mono text-[10px] text-foreground resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button
                  variant="fhenix"
                  size="xs"
                  onClick={() => navigator.clipboard.writeText(exportedJson)}
                >
                  Copy to Clipboard
                </Button>
              </div>
            ) : null}

            {(modalMode === "self" || modalMode === "sharing") ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm text-foreground">
                    Name (optional)
                  </Label>
                  <Input
                    placeholder={
                      modalMode === "self"
                        ? "My self permit"
                        : "Share with Alice"
                    }
                    value={permitName}
                    onChange={(e) => setPermitName(e.target.value)}
                    className="h-[30px] border-[#5f6368] bg-secondary px-2 text-sm text-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-foreground">Expiration</Label>
                  <Input
                    type="datetime-local"
                    value={expiration}
                    onChange={(e) => setExpiration(e.target.value)}
                    className="h-[30px] border-[#5f6368] bg-secondary px-2 text-sm text-foreground"
                  />
                </div>
                {modalMode === "sharing" ? (
                  <div className="space-y-1.5">
                    <Label className="text-sm text-foreground">
                      Recipient Address
                    </Label>
                    <Input
                      name="recipient-address"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="0x…"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      className="h-[30px] border-[#5f6368] bg-secondary px-2 text-sm text-foreground"
                    />
                  </div>
                ) : null}
              </>
            ) : null}

            {modalMode === "import" ? (
              <div className="space-y-1.5">
                <Label className="text-sm text-foreground">Permit JSON</Label>
                <textarea
                  placeholder="Paste the exported permit JSON…"
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  rows={6}
                  className="w-full border-b border-l border-[#5f6368] bg-secondary p-2 font-mono text-xs text-foreground resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            ) : null}

            {modalError ? (
              <div className="border-b border-l border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
                {modalError}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            {modalMode === "export" ? (
              <Button
                variant="fhenix"
                size="sm"
                onClick={() => setModalOpen(false)}
              >
                Done
              </Button>
            ) : (
              <Button
                variant="fhenix-cta"
                size="sm"
                onClick={handleModalAction}
                disabled={modalLoading}
              >
                {modalLoading
                  ? "Processing…"
                  : modalMode === "import"
                    ? "Import & Sign"
                    : "Create"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
