export const SONIC_ROUTER_ADDRESS = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506";

export const SONIC_ROUTER_ABI = [
  {
    name: "swapExactTokensForTokens",
    type: "function",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "nonpayable"
  },
  {
    name: "getAmountsOut",
    type: "function",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" }
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "view"
  }
] as const;

export const ODOS_ROUTER_ADDRESS = "0xac041df48df9791b0654f1dbbf2cc8450c5f2e9d";

export const ODOS_ROUTER_ABI = [
  {
    name: "swapCompact",
    type: "function",
    inputs: [{ name: "data", type: "bytes" }],
    outputs: [{ name: "outputAmount", type: "uint256" }],
    stateMutability: "nonpayable"
  }
] as const;