export const UNIVERSAL_ROUTER_ADDRESS = "0x92643Dc4F75C374b689774160CDea09A0704a9c2";
export const USDC_E_TOKEN_ADDRESS = "0x29219dd400f2Bf60E5a23d13Be72B486D4038894";
export const WS_TOKEN_ADDRESS = "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38";

// ABI for token approval (standard ERC20 approve function)
export const ERC20_APPROVAL_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  }
];

// ABI for the Universal Router's execute function (simplified to what we need)
export const UNIVERSAL_ROUTER_ABI = [
  {
    inputs: [
      { name: "commands", type: "bytes" },
      { name: "inputs", type: "bytes[]" },
      { name: "deadline", type: "uint256" }
    ],
    name: "execute",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  }
];

// These are the commands and parameters needed for the swap operations
// Based on the transaction data provided
export const SWAP_COMMAND = "0x00"; // Command byte for swaps
export const SWAP_USDC_E_TO_WS_PATH = "29219dd400f2bf60e5a23d13be72b486d4038894000032039e2fb66102314ce7b64ce5ce3e5183bc94ad38000000000000000000000000000000000000000000";
export const SWAP_WS_TO_USDC_E_PATH = "039e2fb66102314ce7b64ce5ce3e5183bc94ad380000c819980b81272dbe83f5dbaa0717af6450604019980000c829219dd400f2bf60e5a23d13be72b486d4038894000000000000000000000000000000000000000000";

// Default slippage tolerance percentage
export const DEFAULT_SLIPPAGE_TOLERANCE = 0.5; // 0.5%

// Default deadline (30 minutes from now in seconds)
export const DEFAULT_DEADLINE_SECONDS = 30 * 60;

// Price approximations (should ideally be fetched from an API)
export const USDC_E_TO_WS_RATE = 1.37; // 1 USDC.e ≈ 1.37 wS
export const WS_TO_USDC_E_RATE = 0.73; // 1 wS ≈ 0.73 USDC.e