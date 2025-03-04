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
import axios from "axios";

// Import from other providers
import { checkTokenBalance, ERC20_ABI } from "../balance-checker/balanceCheckerActionProvider";

// Token addresses and info
const TOKENS = {
  wS: {
    address: "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38",
    symbol: "wS",
    decimals: 18,
    price: 0.57, // Fixed price in USD
    strategies: ["wS-SwapX-Beefy", "Delta-Neutral"]
  },
  USDC_E: {
    address: "0x29219dd400f2Bf60E5a23d13Be72B486D4038894",
    symbol: "USDC.e",
    decimals: 6,
    price: 1.00, // Stablecoin
    strategies: ["USDC.e-SwapX-Beefy", "Delta-Neutral"]
  },
  WETH: {
    address: "0x50c42dEAcD8Fc9773493ED674b675bE577f2634b",
    symbol: "WETH",
    decimals: 18,
    price: 2150.00, // Fixed price in USD
    strategies: []
  },
  aSonWETH: {
    address: "0xe18Ab82c81E7Eecff32B8A82B1b7d2d23F1EcE96",
    symbol: "aSonWETH",
    decimals: 18,
    price: 2150.00, // Same as WETH
    strategies: []
  },
  aSonUSDCE: {
    address: "0x578Ee1ca3a8E1b54554Da1Bf7C583506C4CD11c6",
    symbol: "aSonUSDC.e",
    decimals: 6,
    price: 1.00, // Same as USDC.e
    strategies: []
  }
} as const;

// Strategy definitions
const STRATEGIES = {
  "wS-SwapX-Beefy": {
    name: "wS-SwapX-Beefy Strategy",
    description: "Deposit wS into SwapX vault, then stake LP tokens in Beefy vault for high APY returns.",
    requiredTokens: ["wS"],
    executeCommand: "execute-full-ws-swapx-beefy-strategy",
    estimatedApy: 500, // ~500%
    emoji: "🔥"
  },
  "USDC.e-SwapX-Beefy": {
    name: "USDC.e-SwapX-Beefy Strategy",
    description: "Deposit USDC.e into SwapX vault, then stake LP tokens in Beefy vault for stable returns.",
    requiredTokens: ["USDC_E"],
    executeCommand: "execute-usdce-strategy",
    estimatedApy: 250, // ~250%
    emoji: "💰"
  },
  "Delta-Neutral": {
    name: "Delta Neutral Strategy",
    description: "Supply USDC.e to Aave, borrow wS, and deploy borrowed wS into Beefy's high-yield vault for market-neutral returns.",
    requiredTokens: ["USDC_E"],
    executeCommand: "execute-delta-neutral",
    estimatedApy: 11, // dynamic, but using a placeholder
    emoji: "⚖️"
  }
};

export class PortfolioAnalyzerActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("portfolio-analyzer", []);
  }

  // Get Beefy APY data
  private async getBeefyApyData(): Promise<Record<string, number>> {
    try {
      const response = await axios.get('https://api.beefy.finance/apy');
      return response.data;
    } catch (error) {
      console.error('Error fetching Beefy APY data:', error);
      return {};
    }
  }

  // Get Delta Neutral strategy APY
  private async getDeltaNeutralApy(walletProvider: EvmWalletProvider): Promise<number> {
    try {
      // This would typically call into the delta neutral provider
      // For now, let's hardcode a value
      return 11; // 11% APY
    } catch (error) {
      console.error('Error getting Delta Neutral APY:', error);
      return 0;
    }
  }

  @CreateAction({
    name: "analyze-portfolio-strategies",
    description: "Analyze wallet balances and suggest compatible DeFi strategies",
    schema: z.object({}).strip(),
  })
  async analyzePortfolioStrategies(walletProvider: EvmWalletProvider): Promise<string> {
    try {
      const address = await walletProvider.getAddress();
      const publicClient = createPublicClient({
        chain: sonic,
        transport: http(),
      });

      // Get native balance
      const nativeBalance = await publicClient.getBalance({ address: address as Hex });
      const nativeAmount = Number(formatUnits(nativeBalance, 18));
      
      // Track which tokens the user has
      const userTokens: Record<string, {amount: number, usd: number}> = {};
      
      // Get token balances
      for (const [symbol, token] of Object.entries(TOKENS)) {
        try {
          const balance = await publicClient.readContract({
            address: token.address as Hex,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [address as Hex],
          });

          const amount = Number(formatUnits(balance, token.decimals));
          
          if (amount > 0) {
            userTokens[symbol] = {
              amount,
              usd: amount * token.price
            };
          }
        } catch (error) {
          console.error(`Error fetching ${symbol} balance:`, error);
        }
      }
      
      // Get Beefy APY data
      const apyData = await this.getBeefyApyData();
      
      // Format response
      let response = `## 🔍 Portfolio Strategy Analysis for ${address}\n\n`;
      
      // Add native token info
      response += `### 💼 Available Assets\n\n`;
      
      if (nativeAmount > 0) {
        response += `- 🪙 **Native S**: ${nativeAmount.toFixed(4)} ($${(nativeAmount * 0.57).toFixed(2)})\n`;
        // Native S can be wrapped to wS
        response += `  - *Tip: You can wrap your S tokens to wS using the \`wrap-s\` command to use them in strategies.*\n`;
      }
      
      // Add other tokens
      Object.entries(userTokens).forEach(([symbol, {amount, usd}]) => {
        // Skip aTokens in this section
        if (symbol.startsWith('aSon')) return;
        
        const tokenInfo = TOKENS[symbol as keyof typeof TOKENS];
        response += `- ${getTokenEmoji(symbol)} **${tokenInfo.symbol}**: ${amount.toFixed(4)} ($${usd.toFixed(2)})\n`;
      });
      
      // Compatible strategies section
      response += `\n### ✅ Compatible Strategies\n\n`;
      
      // Check if user has wS
      const hasWS = userTokens['wS']?.amount > 0 || nativeAmount > 0;
      const hasUSDCE = userTokens['USDC_E']?.amount > 0;
      
      // If no compatible assets found
      if (!hasWS && !hasUSDCE) {
        response += `❌ No compatible assets found for available strategies. Consider acquiring wS or USDC.e to use our DeFi strategies.\n`;
      }
      
      // Add wS strategy if compatible
      if (hasWS) {
        const strategy = STRATEGIES["wS-SwapX-Beefy"];
        const actualApy = apyData['sonic-swapx-s-gMLP'] || strategy.estimatedApy;
        
        response += `#### ${strategy.emoji} ${strategy.name} (APY: ~${actualApy.toFixed(2)}%)\n`;
        response += `${strategy.description}\n`;
        response += `- **Required Asset**: wS\n`;
        response += `- **Command**: \`${strategy.executeCommand} [amount]\`\n`;
        response += `- **Example**: \`${strategy.executeCommand} 10\` (deposit 10 wS)\n\n`;
      }
      
      // Add USDC.e strategy if compatible
      if (hasUSDCE) {
        const strategy = STRATEGIES["USDC.e-SwapX-Beefy"];
        const actualApy = apyData['sonic-swapx-usdc-gMLP'] || strategy.estimatedApy;
        
        response += `#### ${strategy.emoji} ${strategy.name} (APY: ~${actualApy.toFixed(2)}%)\n`;
        response += `${strategy.description}\n`;
        response += `- **Required Asset**: USDC.e\n`;
        response += `- **Command**: \`${strategy.executeCommand} [amount]\`\n`;
        response += `- **Example**: \`${strategy.executeCommand} 100\` (deposit 100 USDC.e)\n\n`;
        
        // Delta Neutral strategy is also available with USDC.e
        const dnStrategy = STRATEGIES["Delta-Neutral"];
        const dnApy = await this.getDeltaNeutralApy(walletProvider);
        
        response += `#### ${dnStrategy.emoji} ${dnStrategy.name} (APY: ~${dnApy.toFixed(2)}%)\n`;
        response += `${dnStrategy.description}\n`;
        response += `- **Required Asset**: USDC.e\n`;
        response += `- **Command**: \`${dnStrategy.executeCommand} [amount]\`\n`;
        response += `- **Example**: \`${dnStrategy.executeCommand} 100\` (use 100 USDC.e as collateral)\n`;
        response += `- **APY Check**: Use \`delta-neutral-apy\` to get current exact APY details\n\n`;
      }
      
      // Add recommendations
      response += `### 💡 Recommendations\n\n`;
      
      if (!hasWS && !hasUSDCE) {
        response += `To use our DeFi strategies, you need to acquire wS or USDC.e. You can:\n`;
        response += `- Wrap your native S into wS using \`wrap-s [amount]\`\n`;
        response += `- Bridge USDC.e to Sonic from Ethereum\n`;
      } else if (hasWS && !hasUSDCE) {
        response += `You have wS but no USDC.e. To access more strategies:\n`;
        response += `- Consider bridging USDC.e to access the USDC.e strategy and Delta-Neutral strategy\n`;
      } else if (!hasWS && hasUSDCE) {
        response += `You have USDC.e but no wS. For diversification:\n`;
        response += `- Consider acquiring wS to access the high-yield wS-SwapX-Beefy strategy\n`;
      } else {
        response += `You have both wS and USDC.e, giving you access to all strategies. For optimal returns:\n`;
        response += `- Use the Delta-Neutral strategy for market-neutral returns\n`;
        response += `- Deploy wS in the wS-SwapX-Beefy strategy for higher yield (but with price exposure)\n`;
      }
      
      return response;

    } catch (error) {
      console.error('Error analyzing portfolio strategies:', error);
      return `❌ Failed to analyze portfolio strategies: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  supportsNetwork(network: Network): boolean {
    return network.protocolFamily === "evm";
  }
}

// Helper function to get token emoji
function getTokenEmoji(tokenSymbol: string): string {
  const emojiMap: Record<string, string> = {
    'wS': '🌀',
    'USDC_E': '💵',
    'WETH': '💎',
    'aSonWETH': '🏦💎',
    'aSonUSDCE': '🏦💵',
  };
  
  return emojiMap[tokenSymbol] || '🪙';
}

export const portfolioAnalyzerActionProvider = () => new PortfolioAnalyzerActionProvider(); 