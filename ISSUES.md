# Drip Protocol — GitHub Issues Build Flow

> Progressive build plan structured as GitHub issues. Each issue is a discrete, mergeable unit of work.
> Issues are ordered by dependency — complete each before opening the next.
> Labels: `contracts` `frontend` `infra` `fhe` `tokenomics` `testing` `dx`

---

## WAVE 1 — Foundation (March 30 → April 6)
> Target: Club NFT + Match Engine deployed and verified on Arbitrum Sepolia (Fhenix CoFHE)

---

### Issue #1 — Project scaffold and Hardhat FHE environment setup
**Label:** `dx` `infra`
**Milestone:** Wave 1

**Description:**
Bootstrap the monorepo and configure the Fhenix CoFHE Hardhat environment so all contract development has a working local FHE simulation layer from day one.

**Acceptance criteria:**
- [ ] Monorepo scaffold: `packages/contracts`, `packages/frontend`, `packages/subgraph`
- [ ] `packages/contracts` initialized with Hardhat + TypeScript
- [ ] `@cofhe/hardhat` plugin installed and configured in `hardhat.config.ts`
- [ ] `@fhenixprotocol/contracts` installed — FHE types available (`euint32`, `ebool`, `euint8`)
- [ ] Network config for: `localhost` (FHE mock), `arbitrumSepolia` (Fhenix CoFHE testnet)
- [ ] `.env.example` with required keys: `PRIVATE_KEY`, `ARB_SEPOLIA_RPC`, `FHENIX_GATEWAY_URL`
- [ ] `npx hardhat compile` runs clean with zero errors
- [ ] `npx hardhat test` runs with FHE mock active (empty test suite passes)
- [ ] `README.md` with setup instructions

**Technical notes:**
- Use `fhenix.zone` Arbitrum Sepolia RPC for CoFHE testnet
- The `@cofhe/hardhat` plugin exposes `fhenix.encrypt()` in test helpers — confirm it resolves in tests
- Pin `@fhenixprotocol/contracts` to a fixed version to avoid breaking changes mid-build

---

### Issue #2 — ClubNFT contract
**Label:** `contracts` `fhe`
**Milestone:** Wave 1
**Depends on:** #1

**Description:**
Deploy the Club NFT — the foundational primitive of the entire protocol. Each NFT represents a football club with four on-chain attributes generated via Solidity PRNG.

**Acceptance criteria:**
- [ ] `ClubNFT.sol` inherits `ERC721URIStorage`
- [ ] Struct `ClubStats { uint8 attack; uint8 defense; uint8 midfield; uint8 stamina; uint16 wins; uint16 losses; bool fanTokenUnlocked; }`
- [ ] `mint()`: generates randomised stats (10–100) using `keccak256(block.prevrandao, msg.sender, tokenId)` — acceptable for game-layer randomness
- [ ] `getStats(uint256 tokenId)` returns `ClubStats` — public, no encryption (game layer is transparent)
- [ ] `recordMatch(uint256 tokenId, bool won)` — restricted to `MATCH_CONTRACT_ROLE`; increments wins/losses; sets `fanTokenUnlocked = true` when wins >= 10
- [ ] `upgradeAttribute(uint256 tokenId, uint8 attribute, address payer)` — restricted to `UPGRADE_CONTRACT_ROLE`
- [ ] `AccessControl` roles: `MATCH_CONTRACT_ROLE`, `UPGRADE_CONTRACT_ROLE`, `ADMIN_ROLE`
- [ ] Unit tests: mint produces valid stats, recordMatch updates correctly, role gates reject unauthorized callers
- [ ] Deploy script to Arbitrum Sepolia, address logged to `deployments/arbitrumSepolia.json`

**Technical notes:**
- `attribute` param: 0=attack, 1=defense, 2=midfield, 3=stamina — use enum or constants
- Stats are deliberately public — this is the game layer, transparency builds trust
- `block.prevrandao` is sufficient for game-layer randomness; perps/betting use FHE for financial randomness

---

### Issue #3 — MatchEngine contract
**Label:** `contracts`
**Milestone:** Wave 1
**Depends on:** #2

**Description:**
The match engine is the oracle. It reads club stats, runs a deterministic outcome calculation seeded by PRNG, records results, and triggers downstream settlement hooks.

**Acceptance criteria:**
- [ ] `MatchEngine.sol` with struct `Match { uint256 club1Id; uint256 club2Id; address challenger; address acceptor; uint8 outcome; bool settled; uint256 timestamp; }`
- [ ] `challenge(uint256 club1Id, uint256 club2Id)` — msg.sender must own club1, locks a match record
- [ ] `accept(uint256 matchId)` — msg.sender must own club2, triggers match resolution
- [ ] Match resolution: weighted random using both clubs' aggregate stats + PRNG seed — outcome is 0 (club1 win), 1 (draw), 2 (club2 win)
- [ ] On resolution: calls `ClubNFT.recordMatch()` for both clubs
- [ ] Settlement hook interface: `IBettingPool.settleMatch(matchId, outcome)` and `IPerpVault.settleIndex(club1Id, outcome)` called after result
- [ ] Formation slot: `submitFormation(uint256 matchId, euint8 formationIndex)` — stores encrypted formation, emits `FormationSubmitted(matchId, address)` event; formations revealed (decrypted) in resolution via FHE
- [ ] Unit tests: challenge/accept flow, stat-weighted outcome distribution (run 1000 simulations, verify expected win rate for stat-dominant club is 55–70%)
- [ ] Deploy and wire to ClubNFT — set `MATCH_CONTRACT_ROLE`

**Technical notes:**
- Formation reveal: call `FHE.decrypt(formation)` inside match resolution — this is a valid FHE operation on Fhenix
- Settlement hook calls are best-effort; use try/catch so a failing hook doesn't revert the match

---

### Issue #4 — DRIP token contract
**Label:** `contracts` `tokenomics`
**Milestone:** Wave 1
**Depends on:** #1

**Description:**
Deploy the $DRIP utility token. It is burned for upgrades, minted as match rewards, and acts as the protocol's deflationary mechanism.

**Acceptance criteria:**
- [ ] `DripToken.sol` — ERC20 with `AccessControl`
- [ ] `MINTER_ROLE` — assigned to MatchEngine (mints $DRIP to winning club owner after match)
- [ ] `BURNER_ROLE` — assigned to UpgradeManager (burns $DRIP on attribute upgrade)
- [ ] `mint(address to, uint256 amount)` — role-gated
- [ ] `burn(address from, uint256 amount)` — role-gated (uses `burnFrom` internally)
- [ ] Fixed reward per match win: `MATCH_REWARD = 10 * 10**18` (10 DRIP) — adjustable by admin
- [ ] Unit tests: mint/burn, role gates, supply tracking
- [ ] Deploy script, address to `deployments/arbitrumSepolia.json`

---

### Issue #5 — UpgradeManager contract
**Label:** `contracts` `tokenomics`
**Milestone:** Wave 1
**Depends on:** #2 #4

**Description:**
Handles club attribute upgrades — verifies ownership, computes cost, collects fee, burns $DRIP.

**Acceptance criteria:**
- [ ] `UpgradeManager.sol`
- [ ] Cost formula: `baseCost * (currentLevel + 1)**2 / 10` where `baseCost = 100 DRIP`
- [ ] Max level 10 per attribute — revert above
- [ ] Ownership check: calls `ClubNFT.ownerOf(tokenId)` — must equal msg.sender
- [ ] Collects 1% protocol fee to treasury address before burning remainder
- [ ] Calls `ClubNFT.upgradeAttribute()` after successful burn
- [ ] `setTreasury(address)` — admin only
- [ ] Unit tests: cost formula at each level, max level gate, ownership check, fee split
- [ ] Deploy and wire roles on ClubNFT and DripToken

---

### Issue #6 — Wave 1 integration test + testnet deployment
**Label:** `testing` `infra`
**Milestone:** Wave 1
**Depends on:** #2 #3 #4 #5

**Description:**
End-to-end integration test covering the full Wave 1 flow, plus confirmed testnet deployment of all contracts.

**Acceptance criteria:**
- [ ] Integration test (Hardhat with FHE mock): mint two clubs → challenge → accept → verify result recorded → verify DRIP minted → upgrade attribute → verify stat increased
- [ ] Formation submission + reveal tested: submit encrypted formation, simulate match, verify formation decrypted correctly
- [ ] All contracts deployed to Arbitrum Sepolia — addresses in `deployments/arbitrumSepolia.json`
- [ ] Verified on Arbiscan
- [ ] `scripts/deploy-wave1.ts` is clean and idempotent
- [ ] Wave 1 demo video/screenshot: two wallets playing a match on testnet

---

## WAVE 2 — Financial Layer (April 8 → May 8)
> Target: Sealed-bid betting pool + fan token bonding curve, both with FHE privacy layer

---

### Issue #7 — BettingPool contract (sealed-bid FHE)
**Label:** `contracts` `fhe`
**Milestone:** Wave 2
**Depends on:** #3 #6

**Description:**
The core FHE showcase for the betting layer. Bets are submitted as ciphertexts. Running odds are never visible. Settlement computes tally on encrypted state.

**Acceptance criteria:**
- [ ] `BettingPool.sol`
- [ ] `openPool(uint256 matchId)` — called by MatchEngine when a match is accepted; creates pool record
- [ ] `placeBet(uint256 matchId, euint32 amount, ebool side)` — encrypted amount and side (true = club1 wins, false = club2 wins)
  - Stores encrypted bet per user
  - Adds encrypted amount to running encrypted tally per side using `FHE.add()`
  - Collects plaintext ETH/token collateral equal to user's claimed amount — use a commit pattern: user submits plaintext collateral, encrypted amount must decrypt <= collateral (verified at settlement)
- [ ] `settlePool(uint256 matchId, uint8 outcome)` — restricted to `MATCH_CONTRACT_ROLE`
  - Decrypts tally per side
  - Distributes winnings proportional to encrypted bet amounts (decrypt per user at claim time)
  - Handles draw: full refund
  - Deducts 2.5% protocol fee from winning pool
- [ ] `claimWinnings(uint256 matchId)` — decrypts user's encrypted bet amount for payout computation
- [ ] `adminWithdrawFees(address token)` — admin only
- [ ] Unit tests with FHE mock: place bets, settle win/draw/loss, verify payout distribution
- [ ] Integration: MatchEngine calls `settlePool` after match resolution

**Technical notes:**
- The commit-then-prove pattern: user provides plaintext collateral upfront. At settlement, protocol decrypts the bet. If decrypted amount > collateral, the excess is forfeited and added to protocol fee. This prevents encrypted-amount inflation attacks.
- Consider using `euint64` for amounts to avoid overflow on large pools

---

### Issue #8 — FanToken + BondingCurve contract (encrypted trades)
**Label:** `contracts` `fhe`
**Milestone:** Wave 2
**Depends on:** #2 #6

**Description:**
Each club that hits 10 wins gets its own ERC-20 fan token with a linear bonding curve. Trade sizes are encrypted to prevent front-running.

**Acceptance criteria:**
- [ ] `FanTokenFactory.sol` — deploys a new `FanToken` + `BondingCurve` pair when `ClubNFT.fanTokenUnlocked = true`
- [ ] `FanToken.sol` — standard ERC-20, minted and burned by `BondingCurve` only
- [ ] `BondingCurve.sol`
  - Linear curve: `price = BASE_PRICE + SLOPE * totalSupply`
  - `buy(uint256 clubId, euint32 encryptedAmount)` — encrypted token amount; protocol decrypts via FHE.decrypt at execution, mints tokens, charges ETH
  - `sell(uint256 clubId, euint32 encryptedAmount)` — encrypted sell amount; burns tokens, returns ETH
  - Slippage protection: user provides `maxSlippageBps` in plaintext; revert if actual impact exceeds it (computed after decryption)
  - 3% royalty on every trade → club owner (via `ClubNFT.ownerOf(clubId)`)
  - 1% protocol fee on every trade → treasury
- [ ] `setSlope(uint256)` and `setBasePrice(uint256)` — admin only, for initial parameterisation
- [ ] Unit tests: buy/sell flow, royalty distribution, fee collection, slippage revert
- [ ] Integration test: club hits 10 wins, factory deploys token pair, trade executed

**Technical notes:**
- Encrypting trade size prevents sandwich attacks. The price impact is resolved after FHE.decrypt inside the contract call — frontrunners cannot read the size from the mempool.
- Consider a minimum buy of 1 token to prevent dust attacks

---

### Issue #9 — Wave 2 integration test + testnet deployment
**Label:** `testing` `infra`
**Milestone:** Wave 2
**Depends on:** #7 #8

**Acceptance criteria:**
- [ ] Full E2E: mint clubs → play 10 matches → fan token unlocked → buy/sell fan tokens with encrypted amounts
- [ ] Full betting flow: open pool → place encrypted bets (3 wallets) → settle match → claim winnings
- [ ] Verify FHE encryption: running pool tally is NOT readable during live betting (confirm via event inspection — no plaintext tally emitted)
- [ ] All new contracts deployed to Arbitrum Sepolia and Arbiscan-verified
- [ ] `scripts/deploy-wave2.ts` idempotent

---

## WAVE 3 — Core Protocol (April 8 → May 8 marathon)
> Target: Encrypted perpetuals vAMM + full protocol integration + $DRIP flywheel

---

### Issue #10 — PerpVault + encrypted vAMM
**Label:** `contracts` `fhe`
**Milestone:** Wave 3
**Depends on:** #3 #9

**Description:**
The perpetuals market — the most technically ambitious FHE component. Positions are fully encrypted. Funding rate is computed on encrypted OI. Liquidation is triggered by on-chain FHE comparison.

**Acceptance criteria:**
- [ ] `PerpVault.sol`
- [ ] Index per club: `mapping(uint256 clubId => uint256 winProbIndex)` (0–100, public — it's the underlying, not the position)
- [ ] Struct `Position { euint64 size; euint8 leverage; euint64 liqPrice; ebool isLong; address owner; uint256 clubId; uint256 collateral; bool active; }`
- [ ] `openPosition(uint256 clubId, euint64 size, euint8 leverage, ebool isLong)` — encrypted size, leverage, direction; computes liqPrice using FHE arithmetic; stores position struct
- [ ] `closePosition(uint256 positionId)` — decrypts position for msg.sender (permit required), settles PnL against collateral
- [ ] `settleIndex(uint256 clubId, uint8 outcome)` — restricted to `MATCH_CONTRACT_ROLE`; sets index: win=75, draw=50, loss=25; triggers liquidation sweep
- [ ] `computeFundingRate()` — called by keeper; uses `FHE.add()` over all position sizes per side to compute encrypted aggregate OI; decrypts aggregate for rate computation only
- [ ] `liquidate(uint256 positionId)` — callable by anyone; uses `FHE.lt(equity, threshold)` returning `ebool`; if true, liquidates and sends 1% of remaining collateral to liquidator — liquidator never sees position size
- [ ] 0.1% taker fee on open and close (applied to plaintext collateral)
- [ ] Unit tests: open/close, liquidation trigger at correct threshold, funding rate, index settlement
- [ ] Integration: MatchEngine calls `settleIndex` after match

**Technical notes:**
- liqPrice formula (long): `entryIndex * collateral / (collateral + collateral/leverage)` — all in FHE
- Funding rate: `longOI > shortOI` → longs pay shorts; `rate = |longOI - shortOI| / totalOI * BASE_RATE`; compute this on plaintext OI after decryption — only the aggregate is revealed, not individual positions

---

### Issue #11 — Keeper and liquidation bot (off-chain)
**Label:** `infra`
**Milestone:** Wave 3
**Depends on:** #10

**Description:**
Off-chain keeper scripts for funding rate cranks and liquidation monitoring. These are permissionless — anyone can run them.

**Acceptance criteria:**
- [ ] `scripts/keeper/fundingRate.ts` — polls `PerpVault.computeFundingRate()` every N blocks, submits tx
- [ ] `scripts/keeper/liquidationBot.ts` — iterates open positions, calls `PerpVault.liquidate(positionId)` for each, filters on-chain result (ebool from FHE comparison); profitable calls proceed, failed calls skipped
- [ ] Both scripts use `ethers.js` + configured provider
- [ ] README section: "Running the keeper"
- [ ] Unit test: mock PerpVault, confirm keeper calls liquidate for undercollateralised positions

**Technical notes:**
- The liquidation bot does NOT need to know position sizes — it calls liquidate on every active position; the contract rejects non-liquidatable positions via FHE comparison. This is the privacy-preserving liquidation model.

---

### Issue #12 — Protocol integration: wire all contracts
**Label:** `contracts` `infra`
**Milestone:** Wave 3
**Depends on:** #5 #7 #8 #10

**Description:**
Wire all contracts together — MatchEngine is the hub that triggers BettingPool, PerpVault, and ClubNFT in sequence.

**Acceptance criteria:**
- [ ] `MatchEngine` holds interface references to `BettingPool`, `PerpVault`, `ClubNFT`, `DripToken`
- [ ] Match resolution sequence: (1) compute outcome, (2) call ClubNFT.recordMatch, (3) call BettingPool.settlePool, (4) call PerpVault.settleIndex, (5) call DripToken.mint to winner — all in one tx with try/catch per step
- [ ] `ProtocolConfig.sol` — single source of truth for all contract addresses and global params; each contract reads from it via immutable reference
- [ ] Admin setter: `ProtocolConfig.setAddress(bytes32 key, address value)` — timelock guarded (48h delay for safety)
- [ ] Integration test: full match lifecycle triggers all downstream effects correctly
- [ ] Gas profiling: document gas cost of full match resolution (target < 500k gas)

---

### Issue #13 — Wave 3 integration + testnet deployment
**Label:** `testing` `infra`
**Milestone:** Wave 3
**Depends on:** #10 #11 #12

**Acceptance criteria:**
- [ ] E2E: mint clubs → open encrypted perp position → play match → index settles → PnL realised → funding rate applied
- [ ] Liquidation test: open position at near-liquidation threshold → match result moves index → keeper liquidates → liquidator earns fee → position owner loses only collateral (position size never emitted in plaintext)
- [ ] All Wave 3 contracts deployed and verified on Arbitrum Sepolia
- [ ] `scripts/deploy-wave3.ts` idempotent, wires all contracts

---

## WAVE 4 — Frontend + UX (May 11 → May 20)
> Target: Complete dApp, subgraph indexer, all encrypted UX flows

---

### Issue #14 — Subgraph indexer
**Label:** `infra`
**Milestone:** Wave 4
**Depends on:** #13

**Description:**
Index all protocol events for efficient frontend querying. The Graph subgraph for match history, club stats, fan token prices, and position summaries.

**Acceptance criteria:**
- [ ] `packages/subgraph` — Graph Protocol scaffold
- [ ] Entities: `Club`, `Match`, `BettingPool`, `Bet`, `FanToken`, `BondingCurvePoint`, `Position`, `FundingRateSnapshot`
- [ ] Event handlers for all contract events
- [ ] Deployed to The Graph hosted service (or self-hosted for testnet)
- [ ] GraphQL queries documented in `packages/subgraph/README.md`

---

### Issue #15 — Frontend scaffold + wallet connection
**Label:** `frontend`
**Milestone:** Wave 4
**Depends on:** #1

**Description:**
Bootstrap the Next.js frontend with wagmi, viem, and the Fhenix CoFHE React SDK wired in.

**Acceptance criteria:**
- [ ] `packages/frontend` — Next.js 14, TypeScript, Tailwind CSS
- [ ] `wagmi` + `@rainbow-me/rainbowkit` for wallet connection
- [ ] `@cofhe/react` installed — `useEncrypt`, `useDecrypt`, `useWrite` hooks available
- [ ] Fhenix Arbitrum Sepolia chain config added to wagmi
- [ ] Network switcher that guides users to Arbitrum Sepolia (Fhenix CoFHE)
- [ ] Layout: navbar (connect wallet, nav links), footer

---

### Issue #16 — Club dashboard page
**Label:** `frontend`
**Milestone:** Wave 4
**Depends on:** #14 #15

**Acceptance criteria:**
- [ ] `/clubs` — grid of all minted clubs with stats, owner, W/L record
- [ ] `/clubs/[tokenId]` — club detail: stats bars, match history (from subgraph), upgrade UI, challenge button
- [ ] Upgrade flow: attribute selector → DRIP approval → upgrade tx → optimistic UI update
- [ ] Mint flow: "Mint Club" button → tx → redirect to new club page
- [ ] Responsive, mobile-friendly

---

### Issue #17 — Match room page
**Label:** `frontend` `fhe`
**Milestone:** Wave 4
**Depends on:** #15 #16

**Acceptance criteria:**
- [ ] `/match/[matchId]` — live match room showing both clubs, bet pool status, formation submission
- [ ] Formation submission: `useEncrypt` to encrypt `euint8` formation index client-side → `useWrite` to call `submitFormation`
- [ ] Bet placement: `useEncrypt` to encrypt bet amount + side → `useWrite` to call `placeBet` — UX shows "Your bet is sealed. Running odds are intentionally hidden."
- [ ] Match resolution animation: outcome reveal, settlement status per downstream contract
- [ ] Winnings claim button for settled matches

---

### Issue #18 — Fan token trading page
**Label:** `frontend` `fhe`
**Milestone:** Wave 4
**Depends on:** #15 #14

**Acceptance criteria:**
- [ ] `/tokens/[clubId]` — bonding curve chart (from subgraph price points), buy/sell UI
- [ ] Buy: encrypt amount via `useEncrypt` → `useWrite` to `BondingCurve.buy` — UX: "Trade size is encrypted. Your order cannot be front-run."
- [ ] Sell: same encrypted flow
- [ ] Portfolio sidebar: user's fan token balances (via subgraph + `useDecrypt` for encrypted balances if any)
- [ ] Royalty tracker: club owner sees accrued royalties, withdraw button

---

### Issue #19 — Perpetuals trading page
**Label:** `frontend` `fhe`
**Milestone:** Wave 4
**Depends on:** #15 #14

**Acceptance criteria:**
- [ ] `/perps` — club selector, long/short toggle, size + leverage inputs, collateral input
- [ ] Open position: all encrypted fields use `useEncrypt` → `useWrite`
- [ ] My positions panel: `useDecrypt` with user permit to display own position details in plaintext — other users cannot see these
- [ ] Win probability index chart per club (from subgraph — this is public)
- [ ] Funding rate display (from subgraph snapshots)
- [ ] Close position flow: confirm, tx, PnL display

---

### Issue #20 — Wave 4 QA and polish
**Label:** `testing` `frontend`
**Milestone:** Wave 4
**Depends on:** #16 #17 #18 #19

**Acceptance criteria:**
- [ ] All pages tested on Arbitrum Sepolia (Fhenix CoFHE) with real transactions
- [ ] Encrypted flows verified: open devtools network tab, confirm no plaintext amounts appear in calldata for FHE transactions
- [ ] Error states: wallet not connected, wrong network, insufficient balance, approval needed — all handled gracefully
- [ ] Mobile responsive audit: all pages usable on 375px viewport
- [ ] Loading states and optimistic updates on all write operations
- [ ] Lighthouse score > 80 on performance

---

## WAVE 5 — Audit, Polish, Launch (May 23 → June 1)
> Target: Security review, mainnet preparation, ecosystem showcase

---

### Issue #21 — Security review and FHE audit prep
**Label:** `contracts` `testing`
**Milestone:** Wave 5
**Depends on:** #13

**Acceptance criteria:**
- [ ] Internal audit checklist completed for all contracts:
  - [ ] Reentrancy guards on all state-changing external calls
  - [ ] Access control: every privileged function has role check
  - [ ] FHE overflow: confirm `euint64` is sufficient for max position sizes
  - [ ] Encrypted amount collateral check: commit-then-prove pattern holds for all FHE inputs
  - [ ] Oracle manipulation: PRNG seeding cannot be gamed by validator (confirm `prevrandao` limitations acknowledged)
- [ ] Slither static analysis run — all high/medium findings addressed
- [ ] Test coverage > 90% on all contracts (Hardhat coverage report)
- [ ] Formal audit scope document prepared for external auditor handoff

---

### Issue #22 — Mainnet prep and deployment scripts
**Label:** `infra`
**Milestone:** Wave 5
**Depends on:** #21

**Acceptance criteria:**
- [ ] `scripts/deploy-mainnet.ts` with multi-sig deployer (Gnosis Safe) as owner/admin
- [ ] Timelock controller (48h) on all `ProtocolConfig` setter functions
- [ ] Upgrade path documented: proxy pattern or migration strategy for future contract upgrades
- [ ] Gas cost analysis for all user-facing transactions — documented in `GAS.md`
- [ ] `DEPLOYMENT.md` with step-by-step mainnet deployment checklist

---

### Issue #23 — Documentation and ecosystem showcase
**Label:** `dx`
**Milestone:** Wave 5
**Depends on:** #20

**Acceptance criteria:**
- [ ] `docs/` directory with:
  - `architecture.md` — system diagram + contract interaction map
  - `fhe-design.md` — encrypted data types, access control model, FHE operations used
  - `user-guide.md` — how to mint, match, bet, trade, and open perps
  - `keeper-guide.md` — how to run the liquidation and funding rate keeper
- [ ] Demo video: full user journey (mint → match → bet → trade fan tokens → open perp → settlement) on testnet
- [ ] Fhenix buildathon submission: AKINDO form + GitHub repo link + demo video
- [ ] Telegram/Discord announcement drafted

---

## Cross-cutting issues (any wave)

---

### Issue #24 — Events and logging standard
**Label:** `contracts` `dx`
**Milestone:** Wave 1

**Acceptance criteria:**
- [ ] Every state-changing function emits a structured event
- [ ] Events never emit FHE ciphertext in plaintext fields (encrypted values omitted or emitted as `bytes` with a note they are ciphertext)
- [ ] Event naming convention: `{Contract}{Action}` e.g. `ClubNFTMinted`, `MatchResolved`, `BetPlaced`, `PositionOpened`
- [ ] NatSpec on all public functions

---

### Issue #25 — Encrypted UX copy standard
**Label:** `frontend` `dx`
**Milestone:** Wave 4

**Description:**
Define and implement consistent UX messaging for all FHE-encrypted interactions so users understand why their data is private and how to decrypt their own state.

**Acceptance criteria:**
- [ ] Copy library: standard messages for "your bet is sealed", "your position is private", "trade size is encrypted"
- [ ] `useDecrypt` permit flow has a clear explanation tooltip: "You are generating a one-time decryption permit. This only reveals your data to you."
- [ ] Error message for missing permit: "Connect your wallet to view your private position details"
- [ ] Loading state during FHE decrypt: "Decrypting your data on-chain..."
