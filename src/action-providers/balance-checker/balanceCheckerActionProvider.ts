import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import { 
  createPublicClient,
  http, 
  formatUnits, 
  type Address,
  type Hex
} from 'viem';
import { sonic } from 'viem/chains';
import "reflect-metadata";

// Token addresses and info
const TOKENS = {
  wS: {
    address: "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38",
    symbol: "wS",
    decimals: 18,
    price: 0.57, // Fixed price in USD
    emoji: "🌀"
  },
  USDC_E: {
    address: "0x29219dd400f2Bf60E5a23d13Be72B486D4038894",
    symbol: "USDC.e",
    decimals: 6,
    price: 1.00, // Stablecoin
    emoji: "💵"
  },
  WETH: {
    address: "0x50c42dEAcD8Fc9773493ED674b675bE577f2634b",
    symbol: "WETH",
    decimals: 18,
    price: 2150.00, // Fixed price in USD
    emoji: "💎"
  },
  aSonWETH: {
    address: "0xe18Ab82c81E7Eecff32B8A82B1b7d2d23F1EcE96",
    symbol: "aSonWETH",
    decimals: 18,
    price: 2150.00, // Same as WETH
    emoji: "🏦💎"
  },
  aSonUSDCE: {
    address: "0x578Ee1ca3a8E1b54554Da1Bf7C583506C4CD11c6",
    symbol: "aSonUSDC.e",
    decimals: 6,
    price: 1.00, // Same as USDC.e
    emoji: "🏦💵"
  }
} as const;

// ERC20 ABI for balance checking
export const ERC20_ABI = [{
  name: "balanceOf",
  type: "function",
  inputs: [{ name: "account", type: "address" }],
  outputs: [{ name: "balance", type: "uint256" }],
  stateMutability: "view"
}] as const;

export class BalanceCheckerActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("balance-checker", []);
  }

  @CreateAction({
    name: "check-balances",
    description: "Check wallet balances including supplied assets in Aave",
    schema: z.object({}).strip(),
  })
  async checkBalances(walletProvider: EvmWalletProvider): Promise<string> {
    try {
      const address = await walletProvider.getAddress();
      const publicClient = createPublicClient({
        chain: sonic,
        transport: http(),
      });

      // Get native balance
      const nativeBalance = await publicClient.getBalance({ address: address as Hex });
      const nativeUSD = Number(formatUnits(nativeBalance, 18)) * 0.57; // S price

      let totalUSD = nativeUSD;
      let response = `## 💼 Current Portfolio for ${address}:\n\n`;
      response += `### 🪙 Native Tokens:\n`;
      response += `- **S**: ${formatUnits(nativeBalance, 18)} S ($${nativeUSD.toFixed(2)})\n\n`;
      
      // Wallet Assets
      response += `### 👛 Wallet Assets:\n`;
      for (const [symbol, token] of Object.entries(TOKENS)) {
        if (symbol.startsWith('aSon')) continue; // Skip aTokens for now
        
        try {
          const balance = await publicClient.readContract({
            address: token.address as Hex,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [address as Hex],
          });

          const amount = Number(formatUnits(balance, token.decimals));
          const usdValue = amount * token.price;
          totalUSD += usdValue;

          if (amount > 0) {
            response += `- ${token.emoji} **${token.symbol}**: ${amount.toFixed(6)} ${token.symbol} ($${usdValue.toFixed(2)})\n`;
          }
        } catch (error) {
          console.error(`Error fetching ${symbol} balance:`, error);
        }
      }

      // Supplied Assets (aTokens)
      response += `\n### 🏦 Supplied in Aave:\n`;
      for (const [symbol, token] of Object.entries(TOKENS)) {
        if (!symbol.startsWith('aSon')) continue; // Only aTokens
        
        try {
          const balance = await publicClient.readContract({
            address: token.address as Hex,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [address as Hex],
          });

          const amount = Number(formatUnits(balance, token.decimals));
          const usdValue = amount * token.price;
          totalUSD += usdValue;

          if (amount > 0) {
            response += `- ${token.emoji} **${token.symbol}**: ${amount.toFixed(6)} ${token.symbol} ($${usdValue.toFixed(2)})\n`;
          }
        } catch (error) {
          console.error(`Error fetching ${symbol} balance:`, error);
        }
      }

      response += `\n### 💰 Total Portfolio Value: $${totalUSD.toFixed(2)}`;
      return response;

    } catch (error) {
      console.error('Error checking balances:', error);
      return `❌ Failed to check balances: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  supportsNetwork(network: Network): boolean {
    return network.protocolFamily === "evm";
  }
}

export async function checkTokenBalance(
  walletProvider: EvmWalletProvider,
  tokenAddress: string,
  requiredAmount: bigint,
  tokenSymbol: string,
  decimals: number
): Promise<{ hasBalance: boolean; currentBalance: bigint; message: string }> {
  const publicClient = createPublicClient({
    chain: sonic,
    transport: http()
  });

  const address = await walletProvider.getAddress();
  
  const balance = await publicClient.readContract({
    address: tokenAddress as Address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address as Address]
  });

  const hasBalance = balance >= requiredAmount;
  const formattedRequired = formatUnits(requiredAmount, decimals);
  const formattedBalance = formatUnits(balance, decimals);

  return {
    hasBalance,
    currentBalance: balance,
    message: hasBalance 
      ? `✅ Sufficient ${tokenSymbol} balance: ${formattedBalance} ${tokenSymbol}`
      : `❌ Insufficient ${tokenSymbol} balance. You have ${formattedBalance} ${tokenSymbol} but need ${formattedRequired} ${tokenSymbol}. Please add more ${tokenSymbol} to your wallet.`
  };
}