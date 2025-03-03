export const AAVE_POOL_ADDRESS = "0x5362dBb1e601abF3a4c14c22ffEdA64042E5eAA3";
export const USDC_E_ADDRESS = "0x29219dd400f2Bf60E5a23d13Be72B486D4038894";
export const WETH_ADDRESS = "0x50c42dEAcD8Fc9773493ED674b675bE577f2634b";

export const AAVE_POOL_ABI = [
  {
    name: "supply",
    type: "function",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "onBehalfOf", type: "address" },
      { name: "referralCode", type: "uint16" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    name: "withdraw",
    type: "function",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "receiver", type: "address" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
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
  }
] as const;