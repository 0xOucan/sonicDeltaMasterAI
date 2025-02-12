export const XOCOLATL_ADDRESS = "0xa411c9Aa00E020e4f88Bc19996d29c5B7ADB4ACf";
export const HOUSE_OF_RESERVE_ADDRESS = "0xf6b0A809AEb7157E5A1e2C0111cd58FB4987b136";
export const HOUSE_OF_COIN_ADDRESS = "0x02c531Cd9791dD3A31428B2987A82361D72F9b13";
export const ACCOUNT_LIQUIDATOR_ADDRESS = "0x4b75Fb5B0D323672fc6Eac5Afbf487AE4c2ff6de";

export const XOCOLATL_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256", name: "balance" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const HOUSE_OF_RESERVE_ABI = [
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const HOUSE_OF_COIN_ABI = [
  {
    inputs: [
      { name: "xocolatl", type: "address" },
      { name: "houseOfReserve", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "mintCoin",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "backedTokenID", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    name: "paybackCoin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const LIQUIDATOR_ABI = [
  {
    inputs: [
      { name: "userToLiquidate", type: "address" },
      { name: "houseOfReserve", type: "address" },
    ],
    name: "liquidateUser",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
