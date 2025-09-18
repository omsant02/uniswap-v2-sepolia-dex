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

# Uniswap V2 Complete Architecture & Integration

## Full Ecosystem Overview

```
Deployment Flow:
1. UniswapV2Factory → 2. UniswapV2Router02 → 3. Token Pairs → 4. User Integration

Runtime Flow:
User dApp → Router → Factory (find pairs) → Pair Contract → Execute Swap
```

## Complete Contract Architecture

### Core Contracts (Deploy Once)
```solidity
// Step 1: Deploy Factory
UniswapV2Factory factory = new UniswapV2Factory(feeToSetter);

// Step 2: Deploy Router (needs Factory address)
UniswapV2Router02 router = new UniswapV2Router02(factory, WETH);
```

### Pair Creation (On-Demand)
```solidity
// Step 3: Create trading pairs (anyone can call)
address usdcEthPair = factory.createPair(USDC, WETH);
address daiEthPair = factory.createPair(DAI, WETH);
// Each deploys a full UniswapV2Pair contract
```

### Contract Responsibilities

| Contract | Purpose | When Deployed | Who Calls It |
|----------|---------|---------------|--------------|
| **UniswapV2Factory** | Creates & tracks pairs | Once at launch | Router, dApps |
| **UniswapV2Router02** | User-friendly interface | Once at launch | User dApps |
| **UniswapV2Pair** | Individual AMM pools | Per token pair | Router |
| **ERC20 Tokens** | Assets being traded | Pre-existing | Users |

## Integration Flow for dApps

### Step 1: Setup (What you need)
```typescript
const ROUTER_ADDRESS = "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3"; // Sepolia
const FACTORY_ADDRESS = "0xF62c03E08ada871A0bEb309762E260a7a6a880E6"; // Auto-found by router
```

### Step 2: Path Discovery
```typescript
// Router automatically finds best path:
// Direct: [USDC, DAI] if pair exists
// Via WETH: [USDC, WETH, DAI] if needed
const path = await computePath(tokenA, tokenB);
```

### Step 3: Price Quote
```typescript
const amounts = await router.getAmountsOut(amountIn, path);
const expectedOut = amounts[amounts.length - 1];
```

### Step 4: Execute Swap
```typescript
// Router handles everything internally:
// 1. Finds pair via factory
// 2. Transfers tokens to pair
// 3. Calls pair.swap()
// 4. Returns tokens to user
await router.swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline);
```

## What Happens Under the Hood

```
User calls router.swapExactTokensForTokens()
↓
Router calls factory.getPair(tokenA, tokenB)
↓
Factory returns pair address
↓
Router transfers tokens to pair
↓
Router calls pair.swap()
↓
Pair executes AMM math
↓
Pair sends output tokens to user
```

## Key Insights

- **Factory**: Directory of all pairs, creates new ones
- **Router**: Does the heavy lifting, most dApps only need this
- **Pairs**: Individual AMM pools with liquidity
- **No Proxy Pattern**: Each pair is a full deployed contract
- **Single Fee**: 0.30% for all pairs, no choice needed

## Live Addresses (Sepolia)

| Contract | Address |
|----------|---------|
| Factory | `0xF62c03E08ada871A0bEb309762E260a7a6a880E6` |
| Router | `0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3` |
| WETH | `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14` |

**For most integrations: You only need the Router address.**
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
