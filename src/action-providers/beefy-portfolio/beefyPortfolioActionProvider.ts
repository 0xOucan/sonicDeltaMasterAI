import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import { createPublicClient, http, formatUnits } from "viem";
import type { Hex } from "viem";
import { sonic } from 'viem/chains';
import "reflect-metadata";
import axios from "axios";

import {
  BEEFY_VAULT_ADDRESS,
  BEEFY_VAULT_ABI,
} from "../wsswapx-beefy/constants";

interface BeefyTimelineItem {
  datetime: string;
  product_key: string;
  display_name: string;
  chain: string;
  is_eol: boolean;
  transaction_hash: string;
  share_balance: number;
  usd_balance: number;
  share_to_underlying_price: number;
  underlying_to_usd_price: number;
  type?: string;
}

interface BeefyVaultTVL {
  [key: string]: number;
}

interface BeefyVaultAPY {
  [key: string]: number;
}

export class BeefyPortfolioActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("beefy-portfolio", []);
  }

  private async getBeefyData(address: string) {
    // Get timeline data with no cache
    const timelineResponse = await fetch(
      `https://databarn.beefy.com/api/v1/beefy/timeline?address=${address}&_t=${Date.now()}`,
      {
        headers: {
          'accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );

    const timeline = await timelineResponse.json() as BeefyTimelineItem[];
    return { timeline };
  }

  // Fetch APY data from Beefy API
  private async getBeefyApyData(): Promise<BeefyVaultAPY> {
    try {
      const response = await axios.get('https://api.beefy.finance/apy');
      return response.data;
    } catch (error) {
      console.error('Error fetching Beefy APY data:', error);
      return {};
    }
  }

  @CreateAction({
    name: "check-beefy-portfolio",
    description: "Check your Beefy Finance portfolio and transaction history",
    schema: z.object({}).strip(),
  })
  async checkPortfolio(
    walletProvider: EvmWalletProvider,
  ): Promise<string> {
    try {
      const address = await walletProvider.getAddress();
      console.log("Checking Beefy portfolio for address:", address);

      const { timeline } = await this.getBeefyData(address);
      // Get APY data
      const apyData = await this.getBeefyApyData();

      if (!timeline || timeline.length === 0) {
        return "🔍 No transactions found in your Beefy Finance portfolio.";
      }

      let portfolioOutput = `## 🐮 Beefy Finance Portfolio for ${address}\n\n`;
      let totalPortfolioValue = 0;

      // Group by vault and get latest state
      const vaultGroups = timeline.reduce((acc, tx) => {
        const key = tx.product_key;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(tx);
        return acc;
      }, {} as Record<string, BeefyTimelineItem[]>);

      // Process each vault
      for (const [vaultKey, transactions] of Object.entries(vaultGroups)) {
        const latestTx = transactions[0];
        const vaultId = vaultKey.split(':').pop() as string;
        
        // Get APY for this vault
        const vaultApy = apyData[vaultKey] || null;
        
        try {
          const publicClient = createPublicClient({
            chain: sonic,
            transport: http()
          });

          // Get real-time balance
          const balance = await publicClient.readContract({
            address: vaultId as Hex,
            abi: BEEFY_VAULT_ABI,
            functionName: 'balanceOf',
            args: [address as Hex]
          }) as bigint;

          if (balance > BigInt(0)) {
            const ppfs = await publicClient.readContract({
              address: vaultId as Hex,
              abi: BEEFY_VAULT_ABI,
              functionName: 'getPricePerFullShare'
            }) as bigint;

            // Calculate actual token balance
            const tokenBalance = Number(formatUnits(balance, 18));
            const pricePerShare = Number(formatUnits(ppfs, 18));
            const underlyingBalance = tokenBalance * pricePerShare;
            
            // Calculate USD value using the latest transaction's price data
            const usdValue = underlyingBalance * latestTx.underlying_to_usd_price;

            portfolioOutput += `### 📊 ${latestTx.display_name}\n\n`;
            portfolioOutput += `- 💰 **Current Balance**: ${tokenBalance.toFixed(8)} mooTokens\n`;
            portfolioOutput += `- 🔄 **Underlying Balance**: ${underlyingBalance.toFixed(8)} LP\n`;
            portfolioOutput += `- 💵 **USD Value**: $${usdValue.toFixed(2)}\n`;
            
            // Add APY information if available
            if (vaultApy !== null) {
              portfolioOutput += `- 📈 **Current APY**: ${(vaultApy * 100).toFixed(2)}%\n`;
              // Calculate daily yield
              const dailyYield = (usdValue * vaultApy) / 365;
              portfolioOutput += `- 💸 **Est. Daily Yield**: $${dailyYield.toFixed(4)}/day\n`;
            } else {
              portfolioOutput += `- 📈 **APY**: Data unavailable\n`;
            }
            
            portfolioOutput += `- 📊 **Price per Share**: ${pricePerShare.toFixed(8)}\n`;
            portfolioOutput += `- 🕒 **Last Transaction**: ${new Date(latestTx.datetime).toLocaleString()}\n\n`;

            totalPortfolioValue += usdValue;
          }
        } catch (error) {
          console.error(`Error fetching data for vault ${vaultId}:`, error);
          // Show error in portfolio but continue processing
          portfolioOutput += `### ⚠️ ${latestTx.display_name}\n\n`;
          portfolioOutput += `Error fetching current balance. Last known values:\n`;
          portfolioOutput += `- 💵 **USD Value**: $${latestTx.usd_balance.toFixed(2)}\n`;
          
          // Add APY information if available
          if (vaultApy !== null) {
            portfolioOutput += `- 📈 **Current APY**: ${(vaultApy * 100).toFixed(2)}%\n`;
          }
          
          portfolioOutput += `- 🕒 **Last Transaction**: ${new Date(latestTx.datetime).toLocaleString()}\n\n`;
          
          totalPortfolioValue += latestTx.usd_balance;
        }
      }

      portfolioOutput += `## 💲 Total Portfolio Value: $${totalPortfolioValue.toFixed(2)}\n\n`;
      portfolioOutput += `*Note: APY values are current rates and subject to change based on market conditions.*`;
      return portfolioOutput;

    } catch (error) {
      console.error('Portfolio check error:', error);
      return `❌ Failed to check portfolio: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  supportsNetwork(network: Network): boolean {
    return network.protocolFamily === "evm";
  }
}