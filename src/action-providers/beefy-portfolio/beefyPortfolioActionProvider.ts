import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import "reflect-metadata";

interface BeefyTimelineItem {
  datetime: string;
  product_key: string;
  display_name: string;
  chain: string;
  is_eol: boolean;
  is_dashboard_eol: boolean;
  transaction_hash: string;
  share_to_underlying_price: number;
  underlying_to_usd_price: number;
  share_balance: number;
  underlying_balance: number;
  usd_balance: number;
  share_diff: number;
  underlying_diff: number;
  usd_diff: number;
}

export class BeefyPortfolioActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("beefy-portfolio", []);
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

      const apiResponse = await fetch(
        `https://databarn.beefy.com/api/v1/beefy/timeline?address=${address}`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json'
          }
        }
      );

      if (!apiResponse.ok) {
        if (apiResponse.status === 404) {
          return "No Beefy Finance portfolio found for this address. You haven't made any transactions yet.";
        }
        throw new Error(`API request failed with status ${apiResponse.status}`);
      }

      const data = await apiResponse.json();
      const timeline = data as BeefyTimelineItem[];

      if (timeline.length === 0) {
        return "No transactions found in your Beefy Finance portfolio.";
      }

      // Group transactions by vault
      const vaultTransactions = timeline.reduce((acc, tx) => {
        if (!acc[tx.display_name]) {
          acc[tx.display_name] = [];
        }
        acc[tx.display_name].push(tx);
        return acc;
      }, {} as Record<string, BeefyTimelineItem[]>);

      let portfolioOutput = `Beefy Finance Portfolio for ${address}:\n\n`;
      let totalPortfolioValue = 0;

      // Show current positions and recent transactions
      for (const [vaultName, transactions] of Object.entries(vaultTransactions)) {
        const latestTx = transactions[0];
        const usdBalance = latestTx.usd_balance;
        
        if (usdBalance > 0) {
          portfolioOutput += `**${vaultName}**\n`;
          portfolioOutput += `- Current Balance: $${usdBalance.toFixed(2)}\n`;
          portfolioOutput += `- Last Transaction: ${new Date(latestTx.datetime).toLocaleString()}\n`;
          portfolioOutput += `- Transaction Hash: ${latestTx.transaction_hash}\n\n`;
          
          // Add to total only if position is active
          totalPortfolioValue += usdBalance;
        }
      }

      // Add total portfolio value
      portfolioOutput += `\nTotal Portfolio Value: $${totalPortfolioValue.toFixed(2)}`;

      return portfolioOutput;

    } catch (error) {
      console.error('Portfolio check error:', error);
      if (error instanceof Error) {
        return `Failed to check Beefy portfolio: ${error.message}`;
      }
      return 'Unknown error occurred while checking Beefy portfolio';
    }
  }

  supportsNetwork(network: Network): boolean {
    return network.protocolFamily === "evm";
  }
} 