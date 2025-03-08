// export const SONIC_ROUTER_ADDRESS = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506";
export const SONIC_ROUTER_ADDRESS = "0x1D368773735ee1E678950B7A97bcA2CafB330CDc";
// FACTORYPairFactory 0x2dA25E7446A70D7be65fd4c053948BEcAA6374c8
export const WS_TOKEN_ADDRESS = "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38";
export const USDC_E_TOKEN_ADDRESS = "0x29219dd400f2Bf60E5a23d13Be72B486D4038894";

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
      {
        name: "routes",
        type: "tuple[]",
        components: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "stable", type: "bool" }
        ]
      }
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