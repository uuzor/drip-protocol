```markdown
# DRIP PROTOCOL

**Encrypted Sports Finance on EVM**

**Fhenix Privacy-by-Design Buildathon — Project Description**  
*Inspired by the Stellar Drip sports finance architecture | Built on Fhenix + EVM*

## 1. Project Overview

Drip Protocol is a fully on-chain sports finance protocol built on the Fhenix EVM (deployed on Arbitrum Sepolia). It takes direct architectural inspiration from Stellar Drip — a Soroban-native sports finance design — and ports it to the EVM, adding a full Fully Homomorphic Encryption (FHE) privacy layer that makes the financial stack viable for serious players and institutions.

**The core thesis**: a football simulation protocol generates real, verifiable on-chain data (match results, win/loss records) that powers a layered DeFi stack — betting pools, fan token bonding curves, and a perpetuals vAMM. Transparency on the game layer builds trust. Encryption on the financial layer prevents exploitation.

### Why reference Stellar Drip?
Stellar Drip established the cleanest architecture for sports-native DeFi: Club NFTs as the primitive, tactical match execution as the oracle, fan tokens as community equity, and perps as the financial instrument. Drip Protocol preserves this architecture exactly — and makes it production-viable on EVM by solving the front-running and liquidation-hunting problems that make transparent financial rails unusable for real capital.

## 2. The Problem — Why Transparent Rails Break Sports Finance

On-chain sports betting and perpetuals have failed to attract serious capital not because the game mechanics are wrong, but because the financial mechanics are publicly exploitable:

- **Parimutuel betting pools** expose aggregate bets in real time. Large bettors are front-run before settlement.
- **Perpetual positions** — size, leverage, and liquidation price — are fully visible. Adversarial liquidators push the vAMM price toward the most exposed cluster.
- **Fan token trades** on bonding curves are mempool-visible. Whale buys are sandwich-attacked before the price adjusts.
- **Open interest** driving the funding rate is public. Sophisticated actors game the rate calculation by watching OI tilt.

**The result**: retail users lose to bots; institutional capital never enters; the protocol captures fees from a shrinking user base.

### The Architectural Decision
Drip Protocol treats this as an architectural problem, not a UI problem. The solution is not rate limiting, not commit-reveal schemes with trusted coordinators, and not L2 sequencer tricks. It is **FHE** — computation on encrypted state, settled with on-chain guarantees, no trusted intermediary.

## 3. The Solution — Selective Encryption Architecture

Drip Protocol encrypts the financial layer and keeps the game layer transparent. This is a deliberate architectural choice, not a limitation.

### 3.1 What stays transparent
- Club NFT stats (Attack, Defense, Midfield, Stamina) — verifiable by all
- Match execution and PRNG — fair outcomes provable on-chain
- Win/loss records — public performance history
- Fan token bonding curve price function — anyone can verify the pricing formula
- Protocol fee accrual — transparent treasury

### 3.2 What gets encrypted via FHE
- Individual bet amounts and sides — sealed until match settlement
- Perpetual position size, leverage, and liquidation price — hidden from liquidation hunters
- Aggregate open interest used for funding rate computation — rate settles correctly on encrypted state
- Fan token trade size — whale buys and sells cannot be front-run
- Pre-match tactical formation selection — sealed until kick-off, enabling genuine game theory

| Feature                  | Without FHE                                      | With FHE (Drip Protocol)                                      |
|--------------------------|--------------------------------------------------|---------------------------------------------------------------|
| Betting pool             | Bet amounts public; odds manipulable            | Sealed bets; parimutuel settled via FHE arithmetic           |
| Perp positions           | Liq prices visible; position hunting trivial    | Encrypted positions; protocol proves undercollat. via FHE    |
| Fan token trades         | Sandwich attacks on large trades                | Trade size private until settlement                           |
| Funding rate OI          | OI visible; rate front-runnable                 | Aggregate OI computed on ciphertext                           |
| Tactical formations      | Copyable before match starts                    | Sealed reveal at kick-off — new game mechanic                 |

## 4. Protocol Features

### 4.1 Club NFT System
Club NFTs are the primitive that anchors the entire protocol. Each NFT represents a football club with four on-chain attributes — Attack, Defense, Midfield, Stamina — randomised at mint using Fhenix-compatible PRNG. Clubs accumulate win/loss records on-chain and can be upgraded by burning $DRIP tokens.

- Mint with on-chain randomised stats (10–100 per attribute)
- Upgrade attributes by spending $DRIP — cost formula: `base_cost x (level+1)^2 / 10`
- Upgrade contract verifies ownership via cross-contract call before charging
- Win/loss records stored on-chain and used by the fan token unlock condition
- 1% protocol fee on upgrades, withdrawable by admin

### 4.2 Tactical Match System
Matches are the oracle that generates all downstream financial data. The match engine is deterministic given club stats and a PRNG seed, making results verifiable and manipulation-resistant.

- Challenge mechanics: challenger owns `club_1`, acceptor owns `club_2`
- Outcome determined by club stats weighted against Fhenix PRNG — not manipulable by validators
- Match contract cross-calls Club NFT contract to read live stats
- Results trigger: fan token price movement, perp index settlement, betting pool resolution
- **NEW**: Pre-match formation selection submitted as FHE-encrypted inputs — revealed atomically at kick-off

### 4.3 Sealed-Bid Betting
The betting pool is re-architected from a transparent parimutuel to a sealed-bid pool using FHE. Bettors submit encrypted amounts and sides. The tally of bets-per-side is computed on encrypted state. Odds are only calculable at settlement time — making pre-settlement manipulation impossible.

- Encrypted bet size and side submitted via Fhenix SDK
- Pool tally computed over ciphertexts — no one can read running odds
- Draws refund all bettors automatically
- 2.5% protocol fee on winning pools, withdrawable by admin
- Settlement triggered exclusively by the match contract — access-controlled

### 4.4 Fan Tokens (Encrypted Bonding Curve)
Clubs that win 10 matches unlock their fan token. The bonding curve pricing formula is public, but individual trade sizes are encrypted — preventing front-running of large trades that would destabilise early-stage curves.

- Linear bonding curve: price rises with every buy, falls with every sell
- Trade size submitted encrypted — price impact settled on-chain after FHE computation
- 3% royalty on every buy/sell — flows to club owner
- 1% protocol fee on every buy/sell
- Slippage protection maintained even with encrypted trade sizes
- Instant liquidity — sell back to curve at any time

### 4.5 Perpetuals (Encrypted vAMM)
The perpetuals market is the most sophisticated component and the clearest FHE use case. The virtual AMM maintains a win-probability index (0–100%) for each club, settable by match outcomes. Positions are stored encrypted — size, leverage, and liquidation price are never visible to potential adversaries.

- Trade club win-probability index with up to 10x leverage
- Virtual AMM (constant-product) — no real liquidity or counterparty needed
- Position data (size, leverage, liq price) stored as FHE ciphertexts
- Funding rate computed on encrypted aggregate OI — rate settles correctly without revealing book state
- Liquidation: protocol proves position is undercollateralised via FHE comparison before executing — liquidator earns 1% without seeing the position
- Match settlement moves index: win = 75%, draw = 50%, loss = 25%
- 0.1% taker fee on open and close

## 5. FHE Architecture — Technical Design

### 5.1 Encryption Stack

| Layer            | Technology                                      | Purpose                                      |
|------------------|-------------------------------------------------|----------------------------------------------|
| Smart contracts  | Solidity + FHE library (euint32, ebool)        | Encrypted state storage and computation      |
| Client SDK       | @cofhe/sdk                                      | Client-side encrypt/decrypt, permit generation |
| React hooks      | @cofhe/react (useEncrypt, useDecrypt)          | Frontend integration                         |
| Local dev        | Hardhat plugin (@cofhe/hardhat)                | FHE simulation without testnet               |
| Testnet          | Arbitrum Sepolia (Fhenix CoFHE)                | Live encrypted compute layer                 |
| Token standard   | ERC-721 (Club NFTs), ERC-20 (fan tokens, $DRIP)| Standard EVM composability                   |
| vAMM             | Custom constant-product, encrypted OI           | Perp settlement with private state           |

### 5.2 Encrypted Data Types
- `euint32` — bet amounts, position sizes, trade sizes, OI
- `ebool` — bet side (long/short), match outcome gates
- `euint8` — formation selection (tactical input, 0–255 strategy index)
- All types handled natively by Fhenix CoFHE Solidity library

### 5.3 Access Control Model
Decryption permissions follow the Fhenix permit system. Users can decrypt their own position data. The protocol can decrypt aggregate values (total OI, tally per side) for settlement computation. No trusted third party holds decryption keys.

- User permit: owner can view own position, own bet, own token balance in plaintext
- Protocol settlement: aggregate decryption gated behind match contract access control
- Liquidation trigger: protocol calls FHE comparison (`position_equity < threshold`) — boolean result only, no size revealed

## 6. $DRIP Token
- Utility token — spent to upgrade club attributes (burns tokens, deflationary pressure)
- Earned through match wins — protocol mints $DRIP to winning club owner
- Required to challenge matches above a certain tier — skin-in-the-game mechanic
- Protocol treasury funded by all fee streams (betting, upgrades, fan tokens, perps)

## 7. Full Technology Stack

| Layer            | Technology                                      | Purpose                                      |
|------------------|-------------------------------------------------|----------------------------------------------|
| EVM runtime      | Fhenix CoFHE on Arbitrum Sepolia               | Encrypted compute layer                      |
| Smart contracts  | Solidity 0.8.x + @fhenixprotocol/contracts     | All protocol logic                           |
| Dev tooling      | Hardhat + @cofhe/hardhat plugin                | Local FHE simulation                         |
| Frontend         | Next.js + wagmi + @cofhe/react                 | User-facing dApp                             |
| Backend indexer  | The Graph (subgraph)                           | Match history, position indexing             |
| Wallet           | MetaMask / WalletConnect (EVM-standard)        | Standard EVM UX                              |
| Reference arch   | Stellar Drip (Soroban)                         | Game layer design inspiration                |

## 8. Buildathon Category Fit

Drip Protocol is submitted under two intersecting categories from the Fhenix buildathon brief:

- **Confidential DeFi** — sealed-bid betting pools, encrypted perp positions, MEV-protected bonding curve trades
- **Encrypted Gaming** — hidden tactical formations, private player actions, provably fair match outcomes

**The intersection is the core novelty**: the game generates the oracle data; the DeFi stack consumes it. Both layers must exist for either to work. FHE is what makes the financial layer viable rather than exploitable.

## 9. Development Milestones Summary

| Wave   | Phase             | Deliverable                                              | Grant Target |
|--------|-------------------|----------------------------------------------------------|--------------|
| Wave 1 | Foundation        | Club NFT + Match Engine contracts deployed on testnet    | $3,000      |
| Wave 2 | Financial Layer   | Betting pool (sealed-bid FHE) + Fan tokens live         | $5,000      |
| Wave 3 | Core Protocol     | Encrypted vAMM perps + $DRIP token + full integration   | $12,000     |
| Wave 4 | Frontend + UX     | Complete dApp, subgraph indexer, encrypted UX flows      | $14,000     |
| Wave 5 | Audit + Launch    | Security review, mainnet prep, ecosystem showcase        | $16,000     |

## 10. Team

Drip Protocol is submitted as a solo build. The founder brings a track record across multiple EVM and non-EVM hackathons, including a first-place finish at the Seedify Fund BNB Chain Hackathon (PredictBNB — prediction market protocol). Prior work spans DeFi primitives, oracle systems, NFT infrastructure, and on-chain gaming across Solana, Arbitrum, BNB Chain, Sui, and Stacks.

**Relevant prior art**:  
- IVirtualz (virtual Premier League betting on Arbitrum, Chainlink VRF)  
- PredictBNB (prediction markets, BNB Chain)  
- ProofPlay (gaming oracle on Sui)  
- NeutralCurveAMM (DEX infrastructure)  
- PayFiEscrow (stablecoin payment rails)

---

**Drip Protocol — Build the encrypted sports finance layer the ecosystem is missing.**
```
