import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

interface CofheState {
  // Connection
  status: ConnectionStatus;
  account: string | null;
  chainId: number | null;

  // Minting
  mintTxHash: string | null;

  // Balance (encrypted ciphertext hash from contract)
  balanceCtHash: string | null;
  decryptedBalance: string | null;

  // Trigger to refresh permit UI when SDK store changes
  permitVersion: number;

  // Actions
  setStatus: (status: ConnectionStatus) => void;
  setConnection: (account: string, chainId: number) => void;
  disconnect: () => void;
  bumpPermitVersion: () => void;
  setMintTxHash: (hash: string | null) => void;
  setBalanceCtHash: (hash: string | null) => void;
  setDecryptedBalance: (value: string | null) => void;
}

export const useCofheStore = create<CofheState>()(
  persist(
    (set) => ({
      status: "disconnected",
      account: null,
      chainId: null,
      mintTxHash: null,
      balanceCtHash: null,
      decryptedBalance: null,
      permitVersion: 0,

      setStatus: (status) => set({ status }),
      setConnection: (account, chainId) =>
        set({ account, chainId, status: "connected" }),
      disconnect: () =>
        set({
          status: "disconnected",
          account: null,
          chainId: null,
          mintTxHash: null,
          balanceCtHash: null,
          decryptedBalance: null,
          permitVersion: 0,
        }),
      bumpPermitVersion: () =>
        set((state) => ({ permitVersion: state.permitVersion + 1 })),
      setMintTxHash: (hash) => set({ mintTxHash: hash }),
      setBalanceCtHash: (hash) => set({ balanceCtHash: hash }),
      setDecryptedBalance: (value) => set({ decryptedBalance: value }),
    }),
    {
      name: "cofhe-storage",
      partialize: (state) => ({
        account: state.account,
        chainId: state.chainId,
      }),
    },
  ),
);
