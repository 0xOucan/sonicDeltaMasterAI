export const AAVE_POOL_ADDRESS = "0x5362dBb1e601abF3a4c14c22ffEdA64042E5eAA3";
export const AAVE_WETH_GATEWAY = "0x061D8e131F26512348ee5FA42e2DF1bA9d6505E9";

export const BORROWABLE_ASSETS = {
  USDC_E: "0x29219dd400f2Bf60E5a23d13Be72B486D4038894",
  WETH: "0x50c42dEAcD8Fc9773493ED674b675bE577f2634b",
  WS: "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38"
} as const;

export const USDC_E_ADDRESS = BORROWABLE_ASSETS.USDC_E;
export const WETH_ADDRESS = BORROWABLE_ASSETS.WETH;

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
  },
  {
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "interestRateMode", type: "uint256" },
      { name: "referralCode", type: "uint16" },
      { name: "onBehalfOf", type: "address" }
    ],
    name: "borrow",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "interestRateMode", type: "uint256" },
      { name: "onBehalfOf", type: "address" }
    ],
    name: "repay",
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getUserAccountData",
    outputs: [
      { name: "totalCollateralBase", type: "uint256" },
      { name: "totalDebtBase", type: "uint256" },
      { name: "availableBorrowsBase", type: "uint256" },
      { name: "currentLiquidationThreshold", type: "uint256" },
      { name: "ltv", type: "uint256" },
      { name: "healthFactor", type: "uint256" }
    ],
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
  }
] as const;