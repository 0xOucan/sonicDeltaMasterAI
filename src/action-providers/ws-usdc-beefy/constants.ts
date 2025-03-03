export const BEEFY_TOKEN_MANAGER_ADDRESS = "0x5B8F906E9E3355155F05A9c46c5bF3e6D1dEBE5E";
export const ZAP_ROUTER_ADDRESS = "0x03C2E2e84031d913d45B1F5b5dDC8E50Fcb28652";
export const USDC_E_ADDRESS = "0x29219dd400f2Bf60E5a23d13Be72B486D4038894";
export const WS_TOKEN_ADDRESS = "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38";

export const BEEFY_TOKEN_MANAGER_ABI = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

export const ZAP_ROUTER_ABI = [
  {
    inputs: [
      {
        components: [
          { name: "inputs", type: "tuple[]", components: [
            { name: "token", type: "address" },
            { name: "amount", type: "uint256" }
          ]},
          { name: "outputs", type: "tuple[]", components: [
            { name: "token", type: "address" },
            { name: "minOutputAmount", type: "uint256" }
          ]},
          { name: "relay", type: "tuple", components: [
            { name: "target", type: "address" },
            { name: "value", type: "uint256" },
            { name: "data", type: "bytes" }
          ]},
          { name: "user", type: "address" },
          { name: "recipient", type: "address" }
        ],
        name: "_order",
        type: "tuple"
      },
      {
        components: [
          { name: "target", type: "address" },
          { name: "value", type: "uint256" },
          { name: "data", type: "bytes" },
          { name: "tokens", type: "tuple[]", components: [
            { name: "token", type: "address" },
            { name: "index", type: "int32" }
          ]}
        ],
        name: "_route",
        type: "tuple[]"
      }
    ],
    name: "executeOrder",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  }
] as const;

export const ERC20_ABI = [{
  name: "balanceOf",
  type: "function",
  inputs: [{ name: "account", type: "address" }],
  outputs: [{ name: "balance", type: "uint256" }],
  stateMutability: "view"
}] as const;