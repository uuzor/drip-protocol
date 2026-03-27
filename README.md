# Selective Disclosure Demo

A demo application showing how Fully Homomorphic Encryption (FHE) enables privacy-preserving compliance on-chain. Users can mint confidential tokens, manage encryption permits, and selectively disclose balances to verifiers — without exposing their full wallet state.

**Core narrative:** "You don't have to choose between financial privacy and regulatory compliance. With FHE, you control exactly what you prove and to whom."

## How It Works

The app has two roles, designed for a two-presenter live demo:

**Token Holder** (Wallet A)
1. Connect wallet to Arbitrum Sepolia
2. Encrypt an amount client-side and mint confidential cUSD tokens (ERC-7984)
3. Create a self-permit to decrypt and view their own balance
4. Generate an Access Control Permit (ACP) for a compliance verifier
5. Copy and share the ACP JSON off-chain

**Compliance Verifier** (Wallet B)
1. Connect a different wallet
2. Paste the ACP JSON received from the token holder
3. Click "Verify Balance" to decrypt and view the holder's balance
4. See a tamper-proof, cryptographically signed attestation — nothing else

## Tech Stack

- **Contracts:** Solidity 0.8.25, ERC-7984 (confidential token standard), Fhenix CoFHE
- **Client:** React, Vite, TanStack Router, Zustand, Tailwind CSS v4, shadcn/ui
- **Blockchain:** Arbitrum Sepolia testnet
- **FHE SDK:** `@cofhe/sdk` for client-side encryption, permits, and decryption

## Project Structure

```
selective-disclosure-demo/
  packages/
    hardhat/               # Smart contracts & deployment
      contracts/
        MockERC7984Token.sol   # Confidential ERC-7984 token
      deploy/
        00_deploy_MockERC7984Token.ts
    client/                # Frontend monorepo
      apps/web/            # Vite React app
      packages/
        ui/                # Shared UI components (shadcn)
        config/            # TypeScript config
        env/               # Environment validation
```

## Prerequisites

- Node.js >= 20.18.3
- pnpm 9.x
- A browser wallet (MetaMask) configured for Arbitrum Sepolia

## Setup

1. **Install dependencies**

```bash
pnpm install
```

2. **Configure environment**

```bash
cp packages/hardhat/.env.example packages/hardhat/.env
```

Edit `packages/hardhat/.env` and add your deployer private key:

```
DEPLOYER_PRIVATE_KEY=0x...
```

3. **Compile contracts**

```bash
pnpm compile
```

4. **Deploy to Arbitrum Sepolia**

```bash
pnpm deploy --network arbitrumSepolia
```

The deployed contract address will be saved in `packages/hardhat/deployments/arbitrumSepolia/`.

If you redeploy, update the address in `packages/client/apps/web/src/contracts/MockERC7984Token.ts`.

5. **Start the client**

```bash
pnpm start
```

The app runs at `http://localhost:3001`.

## Deployed Contract

| Contract | Network | Address |
|---|---|---|
| MockERC7984Token (cUSD) | Arbitrum Sepolia | `0x442fa2307fE44B3F6C143B28321d40a95206E82f` |

## Demo Script

**Presenter A (Token Holder):**

> "I have USDC I want to keep private on-chain. I'm going to encrypt it — the amount is encrypted client-side before the transaction is even sent. Now, my compliance verifier needs to confirm I actually hold this position. Instead of exposing my entire wallet, I'm issuing a cryptographic permit — scoped specifically to this balance. I'll copy the permit and hand it to them."

**Presenter B (Compliance Verifier):**

> "I've received a permit from the token holder. I'm going to paste it here and verify. What I get is a tamper-proof, cryptographically signed attestation of their encrypted balance — nothing else. Their full wallet state is still encrypted. This is what compliance-grade selective disclosure looks like."

## Available Scripts

| Command | Description |
|---|---|
| `pnpm start` | Start the client dev server |
| `pnpm compile` | Compile Solidity contracts |
| `pnpm deploy` | Deploy contracts |
| `pnpm test` | Run contract tests |
| `pnpm client:build` | Build the client for production |
| `pnpm client:check-types` | Type-check the client |

## License

MIT
