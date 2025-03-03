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
  type Address 
} from 'viem';
import { sonic } from 'viem/chains';
import "reflect-metadata";

// Token addresses on Sonic
const TOKENS = {
  wS: {
    address: "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38",
    symbol: "wS",
    decimals: 18
  },
  USDC_E: {
    address: "0x29219dd400f2Bf60E5a23d13Be72B486D4038894",
    symbol: "USDC.e",
    decimals: 6
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
    name: "check-balance",
    description: "Check S, wS and USDC.e balances in your connected wallet",
    schema: z.object({}),
  })
  async checkBalances(
    walletProvider: EvmWalletProvider,
  ): Promise<string> {
    try {
      // Set up public client
      const publicClient = createPublicClient({
        chain: sonic,
        transport: http()
      });

      // Get wallet address from provider
      const address = await walletProvider.getAddress();
      console.log("Checking balances for address:", address);

      let response = `Wallet Balances for ${address}:\n`;

      // Check native S balance
      try {
        const sBalance = await publicClient.getBalance({ 
          address: address as Address 
        });
        response += `S: ${formatUnits(sBalance, 18)} S\n`;
      } catch (error) {
        console.error('Error fetching S balance:', error);
        response += `S: Error fetching balance\n`;
      }

      // Check token balances
      for (const [symbol, token] of Object.entries(TOKENS)) {
        try {
          const balance = await publicClient.readContract({
            address: token.address as Address,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [address as Address]
          });
          response += `${symbol}: ${formatUnits(balance, token.decimals)} ${token.symbol}\n`;
        } catch (error) {
          console.error(`Error fetching ${symbol} balance:`, error);
          response += `${symbol}: Error fetching balance\n`;
        }
      }

      return response.trim();

    } catch (error) {
      console.error('Balance check error:', error);
      if (error instanceof Error) {
        return `Failed to check balances: ${error.message}`;
      }
      return `Unknown error occurred while checking balances`;
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
      ? `Sufficient ${tokenSymbol} balance: ${formattedBalance} ${tokenSymbol}`
      : `Insufficient ${tokenSymbol} balance. You have ${formattedBalance} ${tokenSymbol} but need ${formattedRequired} ${tokenSymbol}. Please add more ${tokenSymbol} to your wallet.`
  };
}