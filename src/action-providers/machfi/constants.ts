export const MACHFI_ADDRESSES = {
  COMPTROLLER: "0x646F91AbD5Ab94B76d1F9C5D9490A2f6DDf25730",
  PRICE_ORACLE: "0x139Bf94a9cA4a3DB61a7Ce2022F7AECa12cEAa9d",
  CSONIC: "0x9F5d9f2FDDA7494aA58c90165cF8E6B070Fe92e6",
  CUSDC: "0xc84f54b2db8752f80dee5b5a48b64a2774d2b445",
  CWETH: "0x15ef11b942cc14e582797a61e95d47218808800d",
} as const;

// Underlying token addresses
export const TOKEN_ADDRESSES = {
  USDC_E: "0x29219dd400f2Bf60E5a23d13Be72B486D4038894",
  WETH: "0x50c42dEAcD8Fc9773493ED674b675bE577f2634b",
  S: "0x0000000000000000000000000000000000000000" // Native S token
} as const;

// Price constants for calculation
export const TOKEN_PRICE_USD = {
  S: 0.5,          // Example price, should be fetched from oracle
  USDC_E: 1.0,     // Stablecoin
  WETH: 2151.42,   // Example price, should be fetched from oracle
  stLS: 0.51,      // Example price for staked LS
  scUSD: 0.99      // Example price for scUSD
};

// Core functions from the cToken contracts
export const CTOKEN_ABI = [
  // Supply/mint
  {
    inputs: [{ name: "mintAmount", type: "uint256" }],
    name: "mint",
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "mintAmount", type: "uint256" }],
    name: "mintAsCollateral",
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "mintAsCollateral",
    outputs: [{ type: "uint256" }],
    stateMutability: "payable",
    type: "function"
  },
  // Borrow
  {
    inputs: [{ name: "borrowAmount", type: "uint256" }],
    name: "borrow",
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  // Repay
  {
    inputs: [{ name: "repayAmount", type: "uint256" }],
    name: "repayBorrow",
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  // Withdraw
  {
    inputs: [{ name: "redeemTokens", type: "uint256" }],
    name: "redeem",
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  // View functions
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "borrowBalanceCurrent",
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "exchangeRateCurrent",
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "exchangeRateStored",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "borrowBalanceStored",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  // Interest rates
  {
    inputs: [],
    name: "supplyRatePerTimestamp",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "borrowRatePerTimestamp",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  // Total supply and borrows
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "totalBorrows",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  // Get cash in the market
  {
    inputs: [],
    name: "getCash",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

// Comptroller functions for getting account data and managing markets
export const COMPTROLLER_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "getAccountLiquidity",
    outputs: [
      { name: "error", type: "uint256" },
      { name: "liquidity", type: "uint256" },
      { name: "shortfall", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "cToken", type: "address" }],
    name: "markets",
    outputs: [
      { name: "isListed", type: "bool" },
      { name: "collateralFactorMantissa", type: "uint256" },
      { name: "isComped", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "cTokens", type: "address[]" }],
    name: "enterMarkets",
    outputs: [{ name: "errors", type: "uint256[]" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "cToken", type: "address" }],
    name: "exitMarket",
    outputs: [{ name: "error", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "getAllMarkets",
    outputs: [{ type: "address[]" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "getAssetsIn",
    outputs: [{ type: "address[]" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "oracle",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

// Oracle ABI for price fetching
export const PRICE_ORACLE_ABI = [
  {
    inputs: [{ name: "cToken", type: "address" }],
    name: "getUnderlyingPrice",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "asset", type: "address" }],
    name: "getPrice",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "isPriceOracle",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

// Standard ERC20 functions needed
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

export const SECONDS_PER_YEAR = 31536000; // 365 days * 24 hours * 60 minutes * 60 seconds 

// Remove hardcoded TOKEN_PRICE_USD
// Instead create a type-safe asset markets mapping
export type AssetMarketInfo = {
  cToken: string;
  underlying: string;
  symbol: string;
  decimals: number;
  icon: string;
};

export const ASSET_MARKETS: Record<string, AssetMarketInfo> = {
  S: {
    cToken: MACHFI_ADDRESSES.CSONIC,
    underlying: TOKEN_ADDRESSES.S,
    symbol: "S",
    decimals: 18,
    icon: "🔷"
  },
  USDC_E: {
    cToken: MACHFI_ADDRESSES.CUSDC,
    underlying: TOKEN_ADDRESSES.USDC_E,
    symbol: "USDC.e",
    decimals: 6,
    icon: "💵"
  },
  WETH: {
    cToken: MACHFI_ADDRESSES.CWETH,
    underlying: TOKEN_ADDRESSES.WETH,
    symbol: "WETH", 
    decimals: 18,
    icon: "⚡"
  }
} as const;

// Add type for token info
export type TokenInfo = {
  symbol: string;
  decimals: number;
  icon: string;
};

export const TOKEN_INFO: Record<keyof typeof ASSET_MARKETS, TokenInfo> = {
  S: { symbol: "S", decimals: 18, icon: "🔷" },
  USDC_E: { symbol: "USDC.e", decimals: 6, icon: "💵" },
  WETH: { symbol: "WETH", decimals: 18, icon: "⚡" }
} as const; 