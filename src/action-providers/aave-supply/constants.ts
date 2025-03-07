export const AAVE_POOL_ADDRESS = "0x5362dBb1e601abF3a4c14c22ffEdA64042E5eAA3";
export const AAVE_WETH_GATEWAY = "0x061D8e131F26512348ee5FA42e2DF1bA9d6505E9";

// Asset addresses that can be borrowed or supplied to AAVE
export const BORROWABLE_ASSETS = {
  USDC_E: "0x29219dd400f2Bf60E5a23d13Be72B486D4038894",
  WETH: "0x50c42dEAcD8Fc9773493ED674b675bE577f2634b",
  WS: "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38",
  S: "0x0000000000000000000000000000000000000000" // Native S token
} as const;

// aToken addresses (receipt tokens received when supplying assets)
// Note: When borrowing WS or S, they are both tracked as S-debt in AAVE.
// There is no separate AWS token - all S is tracked via AS token.
export const AAVE_TOKENS = {
  AUSDC_E: "0x578Ee1ca3a8E1b54554Da1Bf7C583506C4CD11c6",
  AWETH: "0xe18Ab82c81E7Eecff32B8A82B1b7d2d23F1EcE96",
  // S supply pool is closed - removing the AS token
} as const;

// Variable debt token addresses
export const AAVE_DEBT_TOKENS = {
  S: "0xF6089B790Fbf8F4812a79a31CFAbeB00B06BA7BD", // Correct debt token for both S and WS
  USDC_E: "0x2273caBAd63b7D247A6b107E723c803fc49953A0",
  WETH: "0xc5731dBCD7Ad9E8c84f52F1ac36eB1a45b351992"
} as const;

export const USDC_E_ADDRESS = BORROWABLE_ASSETS.USDC_E;
export const WETH_ADDRESS = BORROWABLE_ASSETS.WETH;
export const S_ADDRESS = BORROWABLE_ASSETS.S;

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