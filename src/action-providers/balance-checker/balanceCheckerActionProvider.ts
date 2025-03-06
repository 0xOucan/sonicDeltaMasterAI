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
  type Hex,
  getAddress,
  isAddress
} from 'viem';
import { sonic } from 'viem/chains';
import "reflect-metadata";
import { BeefyPortfolioActionProvider } from "../beefy-portfolio/beefyPortfolioActionProvider";
import { TOKEN_ADDRESSES } from "../../constants/token-addresses";

// Token addresses and info
const TOKENS = {
  wS: {
    address: TOKEN_ADDRESSES.wS,
    symbol: "wS",
    decimals: 18,
    price: 0.57, // Fixed price in USD
    emoji: "🌀"
  },
  USDC_E: {
    address: TOKEN_ADDRESSES.USDC_E,
    symbol: "USDC.e",
    decimals: 6,
    price: 1.00, // Stablecoin
    emoji: "💵"
  },
  WETH: {
    address: TOKEN_ADDRESSES.WETH,
    symbol: "WETH",
    decimals: 18,
    price: 2150.00, // Fixed price in USD
    emoji: "💎"
  },
  aSonWETH: {
    address: TOKEN_ADDRESSES.aSonWETH,
    symbol: "aSonWETH",
    decimals: 18,
    price: 2150.00, // Same as WETH
    emoji: "🏦💎"
  },
  aSonUSDCE: {
    address: TOKEN_ADDRESSES.aSonUSDCE,
    symbol: "aSonUSDC.e",
    decimals: 6,
    price: 1.00, // Same as USDC.e
    emoji: "🏦💵"
  }
} as const;

// Debt tokens with corrected addresses
const DEBT_TOKENS = {
  variableDebtWS: {
    address: TOKEN_ADDRESSES.variableDebtWS,
    symbol: "variableDebtWS",
    decimals: 18,
    price: 0.57, // Same as wS
    emoji: "📉🌀"
  },
  variableDebtUSDCE: {
    address: TOKEN_ADDRESSES.variableDebtUSDCE,
    symbol: "variableDebtUSDC.e",
    decimals: 6,
    price: 1.00, // Same as USDC.e
    emoji: "📉💵"
  },
  variableDebtWETH: {
    address: TOKEN_ADDRESSES.variableDebtWETH,
    symbol: "variableDebtWETH",
    decimals: 18,
    price: 2150.00, // Same as WETH
    emoji: "📉💎"
  }
};

// Beefy Vault address and abi for retrieving portfolio value
const BEEFY_VAULT_ADDRESS = "0x6f8f189250203c6387656b2cabb00c23b7b7e680"; // wS-SwapX vault
const BEEFY_VAULT_ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pricePerShare",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// ERC20 ABI for balance checking
export const ERC20_ABI = [{
  name: "balanceOf",
  type: "function",
  inputs: [{ name: "account", type: "address" }],
  outputs: [{ name: "balance", type: "uint256" }],
  stateMutability: "view"
}] as const;

export class BalanceCheckerActionProvider extends ActionProvider<EvmWalletProvider> {
  private beefyPortfolioProvider: BeefyPortfolioActionProvider;

  constructor() {
    super("balance-checker", []);
    this.beefyPortfolioProvider = new BeefyPortfolioActionProvider();
  }

  @CreateAction({
    name: "check-balances",
    description: "Check wallet balances including supplied assets in Aave and Beefy portfolio",
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

      let walletAssetsUSD = nativeUSD;
      let aaveSuppliedUSD = 0;
      let aaveBorrowedUSD = 0;
      let beefyPortfolioUSD = 0;
      
      let response = `Here are the current wallet balances for your address **${address}**:\n\n`;
      response += `### 🪙 Native Tokens:\n`;
      response += `- **S**: ${Number(formatUnits(nativeBalance, 18)).toFixed(3)} S ($${nativeUSD.toFixed(2)})\n\n`;
      
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
          walletAssetsUSD += usdValue;

          response += `- ${token.emoji} **${token.symbol}**: ${amount.toFixed(3)} ${token.symbol} ($${usdValue.toFixed(2)})\n`;
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
          aaveSuppliedUSD += usdValue;

          if (amount > 0) {
            response += `- ${token.emoji} **${token.symbol}**: ${amount.toFixed(3)} ${token.symbol} ($${usdValue.toFixed(2)})\n`;
          }
        } catch (error) {
          console.error(`Error fetching ${symbol} balance:`, error);
        }
      }
      
      // Borrowed assets (debt tokens)
      response += `\n### 💸 Borrowed from Aave:\n`;
      let hasDebt = false;
      
      for (const [symbol, token] of Object.entries(DEBT_TOKENS)) {
        try {
          // Validate address with improved error handling
          const validAddress = this.validateAddress(token.address, symbol);
          if (!validAddress) {
            continue;
          }
          
          const balance = await publicClient.readContract({
            address: validAddress,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [address as Hex],
          });

          const amount = Number(formatUnits(balance, token.decimals));
          const usdValue = amount * token.price;
          aaveBorrowedUSD += usdValue;

          if (amount > 0) {
            hasDebt = true;
            response += `- ${token.emoji} **${token.symbol}**: ${amount.toFixed(3)} ${token.symbol} ($${usdValue.toFixed(2)})\n`;
          }
        } catch (error) {
          console.error(`Error fetching ${symbol} balance:`, error);
        }
      }
      
      if (!hasDebt) {
        response += `- No borrowed assets\n`;
      }
      
      // Beefy Portfolio
      response += `\n### 🐮 Beefy Finance Portfolio:\n`;
      try {
        // Use the dedicated BeefyPortfolioActionProvider to get detailed portfolio info
        const portfolioInfo = await this.beefyPortfolioProvider.checkPortfolio(walletProvider);
        
        // If there's a portfolio, show it
        if (!portfolioInfo.includes("No active positions") && 
            !portfolioInfo.includes("Failed to check portfolio")) {
          // Extract the portfolio value from the response
          const valueMatch = portfolioInfo.match(/Total Portfolio Value: \$([0-9.]+)/);
          if (valueMatch && valueMatch[1]) {
            beefyPortfolioUSD = parseFloat(valueMatch[1]);
            response += `- 🏆 **Beefy Finance Portfolio**: $${beefyPortfolioUSD.toFixed(2)}\n`;
          } else {
            // Fallback - show there's a portfolio but we couldn't extract the exact value
            response += `- 🏆 **Beefy Finance Portfolio**: Active (use 'check beefy portfolio' for details)\n`;
          }
        } else {
          response += `- No active Beefy positions\n`;
        }
      } catch (error) {
        console.error(`Error fetching Beefy portfolio:`, error);
        response += `- ❓ Beefy portfolio status unknown (use 'check beefy portfolio' to check)\n`;
      }
      
      // Calculate portfolio value accounting for debts
      const netAaveValue = aaveSuppliedUSD - aaveBorrowedUSD;
      const walletValue = nativeUSD + walletAssetsUSD;
      const portfolioValue = walletValue + netAaveValue + beefyPortfolioUSD;
      
      // Add summary section
      response += `\n### 📊 Portfolio Summary:\n`;
      response += `- 👛 **Wallet Value**: $${walletValue.toFixed(2)}\n`;
      response += `- 🏦 **Aave Net Value**: $${netAaveValue.toFixed(2)} (Supplied: $${aaveSuppliedUSD.toFixed(2)} - Borrowed: $${aaveBorrowedUSD.toFixed(2)})\n`;
      response += `- 🐮 **Beefy Portfolio**: $${beefyPortfolioUSD.toFixed(2)}\n`;
      response += `\n### 💰 Total Portfolio Value: $${portfolioValue.toFixed(2)}`;
      
      return response;

    } catch (error) {
      console.error('Error checking balances:', error);
      return `❌ Failed to check balances: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  supportsNetwork(network: Network): boolean {
    return network.protocolFamily === "evm";
  }

  private validateAddress(address: string, tokenSymbol: string): Hex | null {
    try {
      if (!isAddress(address)) {
        console.error(`Invalid address format for ${tokenSymbol}: ${address}`);
        return null;
      }
      // Get the checksummed address
      return getAddress(address) as Hex;
    } catch (error) {
      console.error(`Error validating address for ${tokenSymbol}:`, error);
      return null;
    }
  }

  private async safeTokenBalance(
    publicClient: any, 
    tokenAddress: string, 
    walletAddress: Hex, 
    decimals: number
  ): Promise<number> {
    try {
      const validAddress = this.validateAddress(tokenAddress, 'token');
      if (!validAddress) {
        return 0;
      }
      
      const balance = await publicClient.readContract({
        address: validAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [walletAddress]
      });
      
      return Number(formatUnits(balance, decimals));
    } catch (error) {
      console.error(`Error fetching balance for ${tokenAddress}:`, error);
      return 0;
    }
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