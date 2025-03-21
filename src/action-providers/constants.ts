// Constants for delta-neutral and other action providers
export const SOME_CONSTANT = "value"; // Add any constants needed by deltaNeutralActionProvider

// Global constants for all action providers
export const WRAP_S_ADDRESS = "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38";
export const S_TOKEN_ABI = [
  {
    "inputs": [],
    "name": "deposit",
    "outputs": [],
    "payable": true,
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"name": "wad", "type": "uint256"}],
    "name": "withdraw",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// For deltaNeutralActionProvider
export const AAVE_POOL_ADDRESS = "0x794a61358d6845594f94dc1db02a252b5b4814ad";
export const AAVE_POOL_ABI = [
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "getUserAccountData",
    "outputs": [
      {"name": "totalCollateralBase", "type": "uint256"},
      {"name": "totalDebtBase", "type": "uint256"},
      {"name": "availableBorrowsBase", "type": "uint256"},
      {"name": "currentLiquidationThreshold", "type": "uint256"},
      {"name": "ltv", "type": "uint256"},
      {"name": "healthFactor", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "asset", "type": "address"}],
    "name": "getReserveData",
    "outputs": [{"type": "tuple", "components": [{"name": "someField", "type": "uint256"}]}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Token information
export const TOKENS = {
  S: { address: "0x0000000000000000000000000000000000000000", price: 0.5, decimals: 18, symbol: "S" },
  WS: { address: "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38", price: 0.5, decimals: 18, symbol: "wS" },
  USDC_E: { address: "0x29219dd400f2Bf60E5a23d13Be72B486D4038894", price: 1.0, decimals: 6, symbol: "USDC.e" },
  WETH: { address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1", price: 2800.0, decimals: 18, symbol: "WETH" }
};

// Constants needed for calculating APYs
export const SECONDS_PER_YEAR = 31536000; 