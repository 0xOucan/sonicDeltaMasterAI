export const WAGMI_ROUTER_ADDRESS = "0xC81dAe2Cdf2f6C0076aE3E174a54985040626D19";
export const USDC_E_ADDRESS = "0x29219dd400f2Bf60E5a23d13Be72B486D4038894";
export const WS_TOKEN_ADDRESS = "0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38";

export const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
    stateMutability: "view"
  },
  {
    name: "allowance",
    type: "function",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "remaining", type: "uint256" }],
    stateMutability: "view"
  },
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "success", type: "bool" }],
    stateMutability: "nonpayable"
  }
] as const;

export const WAGMI_ROUTER_ABI = [
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
] as const;

// Add max uint256 value for unlimited approvals
export const MAX_UINT256 = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

// Add delay between transactions (in milliseconds)
export const TX_DELAY = 2000;