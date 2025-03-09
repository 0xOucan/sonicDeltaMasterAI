import { type Address } from 'viem';

// SWAPX Router address from the transaction
export const SWAPX_ADDRESSES = {
  ROUTER: "0xA047e2AbF8263FcA7c368F43e2f960A06FD9949f" as Address,
  WS_TOKEN: "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38" as Address,
} as const;

// Token addresses
export const TOKEN_ADDRESSES = {
  USDC_E: "0x29219dd400f2Bf60E5a23d13Be72B486D4038894" as Address,
  S: "0x0000000000000000000000000000000000000000" as Address,
  WS: "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38" as Address,
} as const;

// SWAPX Router ABI for exact input single swap
export const SWAPX_ROUTER_ABI = [
  {
    inputs: [{
      components: [
        { name: "tokenIn", type: "address" },
        { name: "tokenOut", type: "address" },
        { name: "recipient", type: "address" },
        { name: "amountIn", type: "uint256" },
        { name: "amountOutMinimum", type: "uint256" },
        { name: "limitSqrtPrice", type: "uint160" }
      ],
      name: "params",
      type: "tuple"
    }],
    name: "exactInputSingle",
    outputs: [{ type: "uint256" }],
    stateMutability: "payable",
    type: "function"
  }
] as const;

// WS Token ABI for wrapping/unwrapping native S
export const WS_TOKEN_ABI = [
  {
    inputs: [],
    name: "deposit",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

// ERC20 ABI for token operations
export const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

// Token info for UI and calculations
export type TokenInfo = {
  symbol: string;
  decimals: number;
  icon: string;
};

export const TOKEN_INFO: Record<string, TokenInfo> = {
  S: { symbol: "S", decimals: 18, icon: "🔷" },
  USDC_E: { symbol: "USDC.e", decimals: 6, icon: "💵" },
  WS: { symbol: "wS", decimals: 18, icon: "⚡" }
} as const;

export const EXPLORER_BASE_URL = "https://sonicscan.org/tx/"; 