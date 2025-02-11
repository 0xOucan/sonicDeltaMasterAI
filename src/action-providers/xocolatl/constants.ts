export const XOCOLATL_ADDRESS = "0xa411c9Aa00E020e4f88Bc19996d29c5B7ADB4ACf";
export const HOUSE_OF_RESERVE_ADDRESS =
  "0xf6b0A809AEb7157E5A1e2C0111cd58FB4987b136";
export const HOUSE_OF_COIN_ADDRESS =
  "0x02c531Cd9791dD3A31428B2987A82361D72F9b13";
export const ACCOUNT_LIQUIDATOR_ADDRESS =
  "0x4b75Fb5B0D323672fc6Eac5Afbf487AE4c2ff6de";

export const XOCOLATL_ABI = [
  // Transfer
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
  // Approve
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
  // BalanceOf
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // Mint
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Burn
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "burn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const HOUSE_OF_RESERVE_ABI = [
  // Deposit
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Withdraw
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Check Max Withdrawal
  {
    inputs: [{ name: "user", type: "address" }],
    name: "checkMaxWithdrawal",
    outputs: [{ name: "max", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // Get Latest Price
  {
    inputs: [],
    name: "getLatestPrice",
    outputs: [{ name: "price", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const HOUSE_OF_COIN_ABI = [
  // Mint Coin (Borrow)
  {
    inputs: [
      { name: "reserveAsset", type: "address" },
      { name: "houseOfReserve", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "mintCoin",
    outputs: [{ name: "success", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Payback Coin (Repay)
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
  // Check Remaining Minting Power
  {
    inputs: [
      { name: "user", type: "address" },
      { name: "hOfReserveAddr", type: "address" },
    ],
    name: "checkRemainingMintingPower",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const LIQUIDATOR_ABI = [
  // Liquidate User
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
  // Compute Cost of Liquidation
  {
    inputs: [
      { name: "user", type: "address" },
      { name: "houseOfReserve", type: "address" },
    ],
    name: "computeCostOfLiquidation",
    outputs: [
      { name: "costAmount", type: "uint256" },
      { name: "collateralAtPenalty", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
