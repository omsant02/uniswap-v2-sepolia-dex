import { useEffect,  useState } from "react";
import {
  useAccount, useConnect, useDisconnect, usePublicClient, useWalletClient,
   useWriteContract, useWaitForTransactionReceipt
} from "wagmi";
import { parseEther, parseUnits, formatUnits, zeroAddress } from "viem";
import type { Address } from "./addresses";
import { V2_FACTORY, V2_ROUTER, WETH9, USDC_SEPOLIA, ETH_PLACEHOLDER } from "./addresses";

import { erc20Abi, factoryAbi, routerAbi } from "./abis";

type Hash = `0x${string}`;

export default function App() {
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync } = useConnect();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();
  const { data: wallet } = useWalletClient();
  const { writeContractAsync } = useWriteContract();

  // UI state
  const [tokenIn, setTokenIn]   = useState<string>(ETH_PLACEHOLDER);
  const [tokenOut, setTokenOut] = useState<string>(USDC_SEPOLIA);
  const [amountIn, setAmountIn] = useState<string>("0.01");
  const [decIn, setDecIn]       = useState<number>(18);
  const [decOut, setDecOut]     = useState<number>(6);
  const [quoteOut, setQuoteOut] = useState<string>("-");
  const [needsApproval, setNeedsApproval] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<Hash | undefined>();
  const { data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

  const isETHin  = tokenIn  === ETH_PLACEHOLDER;
  const isETHout = tokenOut === ETH_PLACEHOLDER;

  // --- helpers
  const addrOrEth = (s: string): s is Address => /^0x[0-9a-fA-F]{40}$/.test(s);

  async function fetchDecimals(addrLike: string): Promise<number> {
    if (!publicClient) return 18;
    if (!addrOrEth(addrLike)) return 18; // ETH -> 18
    const d = await publicClient.readContract({
      address: addrLike,
      abi: erc20Abi,
      functionName: "decimals",
    });
    return Number(d);
  }

  // fetch decimals whenever tokens change
  useEffect(() => {
    (async () => {
      setDecIn(await fetchDecimals(tokenIn));
      setDecOut(await fetchDecimals(tokenOut));
    })();
  }, [tokenIn, tokenOut, publicClient]);

  // compute best path (direct or via WETH)
  async function computePath(): Promise<readonly Address[]> {
    if (!publicClient) return [] as const;

    const A: Address = isETHin ? WETH9 : (tokenIn as Address);
    const B: Address = isETHout ? WETH9 : (tokenOut as Address);

    // if A or B is same after normalization, path is [A] (invalid) -> handle outside
    if (A.toLowerCase() === B.toLowerCase()) return [] as const;

    // 1) try direct A-B
    const direct = await publicClient.readContract({
      address: V2_FACTORY,
      abi: factoryAbi,
      functionName: "getPair",
      args: [A, B],
    });
    if (direct !== zeroAddress) return [A, B] as const;

    // 2) try A-WETH-B
    if (A.toLowerCase() !== WETH9.toLowerCase() && B.toLowerCase() !== WETH9.toLowerCase()) {
      const aW = await publicClient.readContract({
        address: V2_FACTORY,
        abi: factoryAbi,
        functionName: "getPair",
        args: [A, WETH9],
      });
      const wB = await publicClient.readContract({
        address: V2_FACTORY,
        abi: factoryAbi,
        functionName: "getPair",
        args: [WETH9, B],
      });
      if (aW !== zeroAddress && wB !== zeroAddress) return [A, WETH9, B] as const;
    }

    return [] as const; // no route
  }

  // get quote
  useEffect(() => {
    (async () => {
      try {
        if (!publicClient || !amountIn) { setQuoteOut("-"); return; }

        const path = await computePath();
        if (path.length < 2) { setQuoteOut("No liquidity"); return; }

        const amtIn = isETHin
          ? parseEther(amountIn)
          : parseUnits(amountIn, decIn);

        const amounts = await publicClient.readContract({
          address: V2_ROUTER,
          abi: routerAbi,
          functionName: "getAmountsOut",
          args: [amtIn, path as readonly Address[]],
        });

        const outRaw = (amounts as readonly bigint[])[(amounts as readonly bigint[]).length - 1];
        setQuoteOut(formatUnits(outRaw, decOut));
      } catch {
        setQuoteOut("Quote error");
      }
    })();
  }, [publicClient, tokenIn, tokenOut, amountIn, decIn, decOut, isETHin, isETHout]);

  // allowance check (only when tokenIn is ERC-20)
  useEffect(() => {
    (async () => {
      try {
        if (!publicClient || !address || isETHin || !addrOrEth(tokenIn)) { setNeedsApproval(false); return; }
        const allowance: bigint = await publicClient.readContract({
          address: tokenIn as Address,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, V2_ROUTER],
        });
        const required = parseUnits(amountIn || "0", decIn);
        setNeedsApproval(allowance < required);
      } catch {
        setNeedsApproval(true);
      }
    })();
  }, [publicClient, address, tokenIn, amountIn, decIn, isETHin]);

  async function handleConnect() {
    // pick the first available connector (usually 'injected' / MetaMask)
    const connector = connectors[0];
    await connectAsync({ connector });
  }

  async function approve() {
    if (!wallet || isETHin || !addrOrEth(tokenIn)) return;
    const amt = parseUnits(amountIn || "0", decIn);
    const hash = await writeContractAsync({
      address: tokenIn as Address,
      abi: erc20Abi,
      functionName: "approve",
      args: [V2_ROUTER, amt],
    });
    setTxHash(hash as Hash);
  }

  async function swap() {
    if (!wallet || !address) return;

    // guard
    if (!quoteOut || quoteOut === "-" || quoteOut.startsWith("No") || quoteOut.includes("error")) return;

    const path = await computePath();
    if (path.length < 2) return;

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
    const outRaw = parseUnits(quoteOut, decOut);
    const amountOutMin = (outRaw * 995n) / 1000n; // 0.5% slippage

    if (isETHin) {
      const value = parseEther(amountIn);
      const hash = await writeContractAsync({
        address: V2_ROUTER,
        abi: routerAbi,
        functionName: "swapExactETHForTokens",
        args: [amountOutMin, path, address, deadline],
        value,
      });
      setTxHash(hash as Hash);
    } else if (isETHout) {
      const amt = parseUnits(amountIn, decIn);
      const hash = await writeContractAsync({
        address: V2_ROUTER,
        abi: routerAbi,
        functionName: "swapExactTokensForETH",
        args: [amt, amountOutMin, path, address, deadline],
      });
      setTxHash(hash as Hash);
    } else {
      const amt = parseUnits(amountIn, decIn);
      const hash = await writeContractAsync({
        address: V2_ROUTER,
        abi: routerAbi,
        functionName: "swapExactTokensForTokens",
        args: [amt, amountOutMin, path, address, deadline],
      });
      setTxHash(hash as Hash);
    }
  }

  return (
    <div style={{
      maxWidth: 440, margin: "40px auto", padding: 20,
      fontFamily: "ui-sans-serif", border: "1px solid #ddd", borderRadius: 12
    }}>
      <h2 style={{ marginBottom: 16 }}>Uniswap v2 Swap — Sepolia</h2>

      {!isConnected ? (
        <button onClick={handleConnect} style={{ width: "100%", padding: 10, marginBottom: 16 }}>
          Connect Wallet
        </button>
      ) : (
        <button onClick={() => disconnect()} style={{ width: "100%", padding: 10, marginBottom: 16 }}>
          Disconnect ({address?.slice(0,6)}…{address?.slice(-4)})
        </button>
      )}

      <label style={{ fontSize: 12, opacity: 0.8 }}>Token In (address or “ETH”)</label>
      <input
        value={tokenIn}
        onChange={(e) => setTokenIn(e.target.value.trim() || ETH_PLACEHOLDER)}
        placeholder="ETH or 0x..."
        style={{ width: "100%", padding: 8, marginBottom: 10 }}
      />

      <label style={{ fontSize: 12, opacity: 0.8 }}>Token Out (address or “ETH”)</label>
      <input
        value={tokenOut}
        onChange={(e) => setTokenOut(e.target.value.trim() || ETH_PLACEHOLDER)}
        placeholder="ETH or 0x..."
        style={{ width: "100%", padding: 8, marginBottom: 10 }}
      />

      <label style={{ fontSize: 12, opacity: 0.8 }}>Amount In</label>
      <input
        value={amountIn}
        onChange={(e) => setAmountIn(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 12 }}
      />

      <div style={{ margin: "8px 0 12px" }}>
        Estimated Out: <b>{quoteOut}</b>
      </div>

      {!isETHin && needsApproval && (
        <button onClick={approve} disabled={!isConnected}
          style={{ width: "100%", padding: 10, marginBottom: 8 }}>
          Approve
        </button>
      )}

      <button onClick={swap} disabled={!isConnected}
        style={{ width: "100%", padding: 10, background: "#4f46e5", color: "#fff",
                 border: "none", borderRadius: 6 }}>
        Swap
      </button>

      {txHash && (
        <div style={{ marginTop: 10 }}>
          Tx: <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">
            {txHash.slice(0, 10)}…
          </a>
        </div>
      )}
      {receipt && <div style={{ marginTop: 10, color: "green" }}>✅ Confirmed!</div>}

      <details style={{ marginTop: 16 }}>
        <summary>WETH used by this router</summary>
        <div>{WETH9}</div>
      </details>
      <p style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
        Tip: You can paste any ERC-20 address. If there’s no liquidity, you’ll see “No liquidity”.
      </p>
    </div>
  );
}
