export const erc20Abi = [
    { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
    { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
    { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address", name: "a" }], outputs: [{ type: "uint256" }] },
    { type: "function", name: "allowance", stateMutability: "view", inputs: [{ type: "address", name: "o" }, { type: "address", name: "s" }], outputs: [{ type: "uint256" }] },
    { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ type: "address", name: "s" }, { type: "uint256", name: "amt" }], outputs: [{ type: "bool" }] }
] as const;

export const factoryAbi = [
    {
        type: "function", name: "getPair", stateMutability: "view",
        inputs: [{ type: "address", name: "a" }, { type: "address", name: "b" }], outputs: [{ type: "address" }]
    }
] as const;

export const routerAbi = [
    { type: "function", name: "WETH", stateMutability: "pure", inputs: [], outputs: [{ type: "address" }] },
    {
        type: "function", name: "getAmountsOut", stateMutability: "view",
        inputs: [{ type: "uint256", name: "amountIn" }, { type: "address[]", name: "path" }],
        outputs: [{ type: "uint256[]", name: "amounts" }]
    },
    {
        type: "function", name: "swapExactETHForTokens", stateMutability: "payable",
        inputs: [
            { type: "uint256", name: "amountOutMin" },
            { type: "address[]", name: "path" },
            { type: "address", name: "to" },
            { type: "uint256", name: "deadline" }
        ],
        outputs: [{ type: "uint256[]", name: "amounts" }]
    },
    {
        type: "function", name: "swapExactTokensForETH", stateMutability: "nonpayable",
        inputs: [
            { type: "uint256", name: "amountIn" },
            { type: "uint256", name: "amountOutMin" },
            { type: "address[]", name: "path" },
            { type: "address", name: "to" },
            { type: "uint256", name: "deadline" }
        ],
        outputs: [{ type: "uint256[]", name: "amounts" }]
    },
    {
        type: "function", name: "swapExactTokensForTokens", stateMutability: "nonpayable",
        inputs: [
            { type: "uint256", name: "amountIn" },
            { type: "uint256", name: "amountOutMin" },
            { type: "address[]", name: "path" },
            { type: "address", name: "to" },
            { type: "uint256", name: "deadline" }
        ],
        outputs: [{ type: "uint256[]", name: "amounts" }]
    },
] as const;
