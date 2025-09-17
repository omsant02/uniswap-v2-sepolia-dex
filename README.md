# 🦄 Minimal Uniswap v2 Swap DApp (Sepolia)

A simple React + wagmi frontend for swapping tokens on **Uniswap v2** using the Sepolia testnet.  
Supports ETH ↔ ERC20 and ERC20 ↔ ERC20 swaps (via direct pairs or WETH routing).  

---

## 🚀 What’s Inside
- React + Vite + TypeScript
- wagmi + viem for Ethereum interactions
- Uniswap v2 Router, Factory, and Pair contracts
- Works on Sepolia (default token = USDC testnet)

---

## 📚 Background

### Uniswap v1
- **Contracts**:
  - `Factory` → deploys token-specific Exchanges.
  - `Exchange` template → one per ERC20 (all swaps were ETH ↔ ERC20).
- **Limitations**:
  - No ERC20 ↔ ERC20 directly (you had to swap via ETH).
  - No routing, no TWAP oracle, no flash swaps.

### Uniswap v2
- **Contracts**:
  - `Factory` → deploys `Pair` contracts.
  - `Pair` → pool holding *any two ERC20s* (constant product AMM).
  - `Router` → user-facing helper that:
    - Wraps/unwraps ETH ↔ WETH
    - Routes multi-hop swaps (e.g. TokenA → WETH → TokenB)
- **Improvements**:
  - Any ERC20 ↔ ERC20 pairs
  - Built-in TWAP oracle support
  - Flash swaps
  - Cleaner UX via Router

---

## ⚙️ Setup

```bash
# clone repo
git clone https://github.com/yourname/uniswap-v2-swap.git
cd uniswap-v2-swap

# install deps
npm install

# run dev server
npm run dev
