import { useState } from "react";
import { Encryptable } from "@cofhe/sdk";
import { arbitrumSepolia } from "viem/chains";
import { Coins, Check, Lock, Send, Loader2 } from "lucide-react";
import { Button } from "@client/ui/components/button";
import { Input } from "@client/ui/components/input";
import { cofheClient } from "@/stores/cofhe-client";
import { useCofheStore } from "@/stores/cofhe-store";
import { MOCK_ERC7984_TOKEN } from "@/contracts/MockERC7984Token";

type MintStep = "idle" | "encrypting" | "sending" | "confirming" | "done";

const STEPS: { key: MintStep; label: string }[] = [
  { key: "encrypting", label: "Encrypting" },
  { key: "sending", label: "Sending tx" },
  { key: "confirming", label: "Confirming" },
];

function StepIcon({ step, current }: { step: MintStep; current: MintStep }) {
  const stepOrder: MintStep[] = ["encrypting", "sending", "confirming"];
  const currentIdx = stepOrder.indexOf(current);
  const stepIdx = stepOrder.indexOf(step);

  if (current === "done" || currentIdx > stepIdx) {
    return <Check className="size-3 text-accent" />;
  }
  if (current === step) {
    return <Loader2 className="size-3 animate-spin text-accent" />;
  }
  return (
    <div className="size-1.5 rounded-full bg-foreground/20" />
  );
}

export function Mint() {
  const { status, account, mintTxHash, setMintTxHash } = useCofheStore();
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<MintStep>("idle");
  const [error, setError] = useState<string | null>(null);

  const isConnected = status === "connected";
  const isProcessing = step !== "idle" && step !== "done";

  const handleMint = async () => {
    if (!account) return;
    setError(null);

    try {
      setStep("encrypting");
      const value = BigInt(Math.round(parseFloat(amount) * 1e6));

      const [encrypted] = await cofheClient
        .encryptInputs([Encryptable.uint64(value)])
        .execute();

      const walletClient = cofheClient.connection.walletClient;
      const publicClient = cofheClient.connection.publicClient;

      if (!walletClient || !publicClient) {
        throw new Error("Wallet not connected");
      }

      setStep("sending");
      const txHash = await walletClient.writeContract({
        chain: arbitrumSepolia,
        account: account as `0x${string}`,
        address: MOCK_ERC7984_TOKEN.address,
        abi: MOCK_ERC7984_TOKEN.abi,
        functionName: "confidentialMint",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        args: [account as `0x${string}`, encrypted as any],
      });

      setStep("confirming");
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      setStep("done");
      setMintTxHash(txHash);
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Minting failed");
      setStep("idle");
    }
  };

  return (
    <div className="rounded-xl border border-border/30 bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/20 dark:bg-accent/10">
          <Coins className="size-4 text-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Mint Confidential Tokens
          </p>
          <p className="text-xs text-muted-foreground">
            Encrypt an amount client-side, then mint on-chain
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          type="number"
          name="mint-amount"
          autoComplete="off"
          placeholder="Amount…"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={!isConnected || isProcessing}
          className="h-9 flex-1 rounded-lg border-border/30 bg-secondary px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-accent"
        />
        <Button
          variant="fhenix-cta"
          size="sm"
          className="h-9 px-4"
          onClick={handleMint}
          disabled={!isConnected || isProcessing || !amount}
        >
          {isProcessing ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Processing
            </>
          ) : (
            <>
              <Lock className="size-3.5" />
              Encrypt & Mint
            </>
          )}
        </Button>
      </div>

      {/* Step progress */}
      {isProcessing ? (
        <div className="flex items-center gap-1 rounded-lg border border-border/20 bg-secondary px-3 py-2">
          {STEPS.map(({ key, label }, i) => (
            <div key={key} className="flex items-center gap-1">
              {i > 0 ? (
                <div className="mx-1 h-px w-4 bg-foreground/10" />
              ) : null}
              <div className="flex items-center gap-1.5">
                <div className="flex size-5 items-center justify-center">
                  <StepIcon step={key} current={step} />
                </div>
                <span
                  className={`text-xs ${
                    step === key
                      ? "font-medium text-foreground"
                      : STEPS.indexOf({ key, label }) < STEPS.findIndex((s) => s.key === step)
                        ? "text-muted-foreground"
                        : "text-foreground/40"
                  }`}
                >
                  {label}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Success */}
      {step === "done" && mintTxHash ? (
        <div className="flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/8 dark:bg-accent/5 p-3">
          <Check className="mt-0.5 size-3.5 shrink-0 text-accent" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">
              Tokens minted successfully
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground break-all">
              {mintTxHash}
            </p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
}
