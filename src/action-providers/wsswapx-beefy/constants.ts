export const SWAPX_VAULT_ADDRESS = "0x5F62d612c69fF7BE3FBd9a0cD530D57bCbC7b642";
export const BEEFY_VAULT_ADDRESS = "0x816d2AEAff13dd1eF3a4A2e16eE6cA4B9e50DDD8";
export const WS_TOKEN_ADDRESS = "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38";
export const SWAPX_LP_TOKEN_ADDRESS = "0x5F62d612c69fF7BE3FBd9a0cD530D57bCbC7b642";

export const SWAPX_VAULT_ABI = [
  {
    inputs: [
      { name: "deposit0", type: "uint256" },
      { name: "deposit1", type: "uint256" },
      { name: "to", type: "address" }
    ],
    name: "deposit",
    outputs: [{ name: "shares", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    name: "withdraw",
    type: "function",
    inputs: [
      { name: "shares", type: "uint256" },
      { name: "to", type: "address" }
    ],
    outputs: [
      { name: "amount0", type: "uint256" },
      { name: "amount1", type: "uint256" }
    ],
    stateMutability: "nonpayable"
  }
] as const;

export const BEEFY_VAULT_ABI = [
  {
    name: "deposit",
    type: "function",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    name: "depositAll",
    type: "function",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    name: "withdrawAll",
    type: "function",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    name: "getPricePerFullShare",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable"
  },
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
    stateMutability: "view"
  },
  {
    name: "allowance",
    type: "function",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "remaining", type: "uint256" }],
    stateMutability: "view"
  }
] as const;

// Constants specific to wsSwapXBeefyActionProvider
export const WRAP_S_ADDRESS = "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38";
export const S_TOKEN_ABI = [
  // ABI entries
];