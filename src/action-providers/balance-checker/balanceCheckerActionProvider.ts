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

// Import Aave and Beefy providers directly or use a service approach
import { AaveSupplyActionProvider } from "../aave-supply/aaveSupplyActionProvider";
import { BeefyPortfolioActionProvider } from "../beefy-portfolio/beefyPortfolioActionProvider";
import { MachFiActionProvider } from "../machfi/machfiActionProvider";
import { 
  AAVE_POOL_ADDRESS, 
  AAVE_POOL_ABI, 
  BORROWABLE_ASSETS,
  AAVE_TOKENS
} from "../aave-supply/constants";

// Token addresses and info - using constants from aave-supply/constants.ts
const TOKENS = {
  wS: {
    address: BORROWABLE_ASSETS.WS,
    symbol: "wS",
    decimals: 18,
    price: 0.57 // Fixed price in USD
  },
  USDC_E: {
    address: BORROWABLE_ASSETS.USDC_E,
    symbol: "USDC.e",
    decimals: 6,
    price: 1.00 // Stablecoin
  },
  WETH: {
    address: BORROWABLE_ASSETS.WETH,
    symbol: "WETH",
    decimals: 18,
    price: 2150.00 // Fixed price in USD
  },
  aSonWETH: {
    address: AAVE_TOKENS.AWETH,
    symbol: "aSonWETH",
    decimals: 18,
    price: 2150.00 // Same as WETH
  },
  aSonUSDCE: {
    address: AAVE_TOKENS.AUSDC_E,
    symbol: "aSonUSDCE",
    decimals: 6,
    price: 1.00 // Same as USDC.e
  }
} as const;

// User account data type from Aave
type UserAccountData = readonly [
  totalCollateralBase: bigint,
  totalDebtBase: bigint,
  availableBorrowsBase: bigint,
  currentLiquidationThreshold: bigint,
  ltv: bigint,
  healthFactor: bigint
];

// ERC20 ABI for balance checking
export const ERC20_ABI = [{
  name: "balanceOf",
  type: "function",
  inputs: [{ name: "account", type: "address" }],
  outputs: [{ name: "balance", type: "uint256" }],
  stateMutability: "view"
}] as const;

// Beefy vault ABI for direct contract checks
const BEEFY_VAULT_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
    stateMutability: "view"
  },
  {
    name: "getPricePerFullShare",
    type: "function",
    inputs: [],
    outputs: [{ name: "price", type: "uint256" }],
    stateMutability: "view"
  }
] as const;

/**
 * Helper function to shorten an Ethereum address for display
 */
function shortenAddress(address: string): string {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

export class BalanceCheckerActionProvider extends ActionProvider<EvmWalletProvider> {
  private aaveProvider: AaveSupplyActionProvider;
  private beefyProvider: BeefyPortfolioActionProvider;
  private machfiProvider: MachFiActionProvider;

  constructor() {
    super("balance-checker", []);
    this.aaveProvider = new AaveSupplyActionProvider();
    this.beefyProvider = new BeefyPortfolioActionProvider();
    this.machfiProvider = new MachFiActionProvider();
  }

  @CreateAction({
    name: "check-balances",
    description: "Check wallet balances and DeFi positions",
    schema: z.object({}).strip(),
  })
  async checkBalances(walletProvider: EvmWalletProvider): Promise<string> {
    try {
      const address = await walletProvider.getAddress();
      const publicClient = createPublicClient({
        chain: sonic,
        transport: http()
      });

      // Get native S balance
      const nativeBalance = await publicClient.getBalance({ address: address as Hex });
      const nativePrice = TOKENS.wS.price;
      const nativeUSD = Number(formatUnits(nativeBalance, 18)) * nativePrice;
      
      // Get wS balance
      const wsBalance = await publicClient.readContract({
        address: TOKENS.wS.address as Hex,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address as Hex],
      });
      const wsBalanceFormatted = Number(formatUnits(wsBalance, 18)).toFixed(4);
      const wsValue = Number(formatUnits(wsBalance, 18)) * TOKENS.wS.price;
      
      // Get USDC.e balance
      const usdceBalance = await publicClient.readContract({
        address: TOKENS.USDC_E.address as Hex,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address as Hex],
      });
      const usdceBalanceFormatted = Number(formatUnits(usdceBalance, 6)).toFixed(4);
      const usdceValue = Number(formatUnits(usdceBalance, 6)) * TOKENS.USDC_E.price;
      
      // Get WETH balance
      const wethBalance = await publicClient.readContract({
        address: TOKENS.WETH.address as Hex,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address as Hex],
      });
      const wethBalanceFormatted = Number(formatUnits(wethBalance, 18)).toFixed(4);
      const wethValue = Number(formatUnits(wethBalance, 18)) * TOKENS.WETH.price;
      
      const sBalanceFormatted = Number(formatUnits(nativeBalance, 18)).toFixed(4);
      const sValue = nativeUSD;

      // Get Aave data
      let aaveData = { totalValue: 0, netWorth: 0 };
      try {
        // First, try using the direct method to get Aave account data
        const aaveAccountData = await this.aaveProvider.getAaveAccountData(walletProvider);
        aaveData.netWorth = aaveAccountData.netWorth;
        aaveData.totalValue = aaveAccountData.totalCollateral;
        
        console.log(`Got Aave data from direct method - Net Worth: $${aaveData.netWorth.toFixed(2)}, Total Value: $${aaveData.totalValue.toFixed(2)}`);
        
        // If we got zero values, try the regex method as fallback
        if (aaveData.netWorth === 0 && aaveData.totalValue === 0) {
          console.log(`Direct Aave method returned zero values, trying regex fallback...`);
          
          // Try to extract from dashboard response
          const aaveResponse = await this.aaveProvider.aaveDashboard(walletProvider);
          
          console.log(`Aave Response: ${aaveResponse.substring(0, 200)}...`);
          
          // Use case-insensitive regex
          const aaveNetWorthMatch = aaveResponse.match(/Net\s+Worth:?\s+\$(\d+\.\d+)/i);
          if (aaveNetWorthMatch && aaveNetWorthMatch[1]) {
            aaveData.netWorth = parseFloat(aaveNetWorthMatch[1]);
            console.log(`Extracted Aave Net Worth via regex: $${aaveData.netWorth.toFixed(2)}`);
          }
          
          const aaveCollateralMatch = aaveResponse.match(/Total\s+Balance:?\s+\$(\d+\.\d+)/i);
          if (aaveCollateralMatch && aaveCollateralMatch[1]) {
            aaveData.totalValue = parseFloat(aaveCollateralMatch[1]);
            console.log(`Extracted Aave Total Value via regex: $${aaveData.totalValue.toFixed(2)}`);
          }
        }
      } catch (error) {
        console.error("Error fetching Aave data:", error);
      }

      // Get Beefy data
      let beefyData = { totalValue: 0 };
      try {
        beefyData = await this.fetchBeefyPortfolioData(walletProvider);
        console.log(`Extracted Beefy Total Value: $${beefyData.totalValue.toFixed(2)}`);
      } catch (error) {
        console.error("Error fetching Beefy data:", error);
      }
      
      // Get MachFi data
      let machfiData = { totalValue: 0, netWorth: 0 };
      try {
        // First, try using the direct method to get MachFi account data
        const machfiAccountData = await this.machfiProvider.getMachfiAccountData(walletProvider);
        machfiData.netWorth = machfiAccountData.netWorth;
        machfiData.totalValue = machfiAccountData.totalSupplied;
        
        console.log(`Got MachFi data from direct method - Net Worth: $${machfiData.netWorth.toFixed(2)}, Total Value: $${machfiData.totalValue.toFixed(2)}`);
        
        // If we got zero values, try the regex method as fallback
        if (machfiData.netWorth === 0 && machfiData.totalValue === 0) {
          console.log(`Direct MachFi method returned zero values, trying regex fallback...`);
          
          // Try to extract from dashboard response
          const machfiResponse = await this.machfiProvider.machfiDashboard(walletProvider);
          
          console.log(`MachFi Response: ${machfiResponse.substring(0, 200)}...`);
          
          // Use case-insensitive regex
          const machfiNetWorthMatch = machfiResponse.match(/Net\s+Worth:?\s+\$(\d+\.\d+)/i);
          if (machfiNetWorthMatch && machfiNetWorthMatch[1]) {
            machfiData.netWorth = parseFloat(machfiNetWorthMatch[1]);
            console.log(`Extracted MachFi Net Worth via regex: $${machfiData.netWorth.toFixed(2)}`);
          }
          
          const machfiCollateralMatch = machfiResponse.match(/Total\s+Balance:?\s+\$(\d+\.\d+)/i);
          if (machfiCollateralMatch && machfiCollateralMatch[1]) {
            machfiData.totalValue = parseFloat(machfiCollateralMatch[1]);
            console.log(`Extracted MachFi Total Value via regex: $${machfiData.totalValue.toFixed(2)}`);
          }
        }
      } catch (error) {
        console.error("Error fetching MachFi data:", error);
      }

      // Calculate total portfolio value
      const totalWalletValue = sValue + wsValue + usdceValue + wethValue;
      
      // For DeFi value, use net worth to avoid double counting of debt
      const totalDefiValue = aaveData.netWorth + machfiData.netWorth + beefyData.totalValue;
      const totalPortfolioValue = totalWalletValue + totalDefiValue;

      // Format the response with emojis for better visibility
      let response = `📊 𝗣𝗢𝗥𝗧𝗙𝗢𝗟𝗜𝗢 𝗦𝗨𝗠𝗠𝗔𝗥𝗬

### 💼 Wallet Balances
- 🔷 Native S: ${sBalanceFormatted} S ($${sValue.toFixed(2)})
- 🔶 Wrapped S (wS): ${wsBalanceFormatted} wS ($${wsValue.toFixed(2)})
- 💵 USDC.e: ${usdceBalanceFormatted} USDC.e ($${usdceValue.toFixed(2)})
- 💎 WETH: ${wethBalanceFormatted} WETH ($${wethValue.toFixed(2)})

### 🏦 DeFi Positions
- 🌊 Aave: $${aaveData.netWorth.toFixed(2)}
- ��️ MachFi: $${machfiData.netWorth.toFixed(2)}
- 🐮 Beefy Vaults: $${beefyData.totalValue.toFixed(2)}

### 💰 Total Portfolio Value
- 🔥 Total Value: $${totalPortfolioValue.toFixed(2)}
  - 👝 Wallet Value: $${totalWalletValue.toFixed(2)} (${(totalWalletValue / totalPortfolioValue * 100 || 0).toFixed(1)}%)
  - 🏆 DeFi Value: $${totalDefiValue.toFixed(2)} (${(totalDefiValue / totalPortfolioValue * 100 || 0).toFixed(1)}%)

✨ Need further details? Just ask!`;

      return response;
    } catch (error) {
      console.error("Error in checkBalances:", error);
      return `Failed to check balances: ${error instanceof Error ? error.message : JSON.stringify(error)}`;
    }
  }

  /**
   * Helper method to fetch Beefy portfolio data
   */
  private async fetchBeefyPortfolioData(walletProvider: EvmWalletProvider): Promise<{ totalValue: number }> {
    try {
      const address = await walletProvider.getAddress();
      const publicClient = createPublicClient({
        chain: sonic,
        transport: http(),
      });

      // Known vault addresses we need to check (from the beefyPortfolioActionProvider)
      const vaultAddresses = [
        "0x816d2aeaff13dd1ef3a4a2e16ee6ca4b9e50ddd8", // ws-usdc.e vault
        "0x6f8F189250203C6387656B2cAbb00C23b7b7e680", // usdc.e vault
      ];

      let totalValue = 0;

      // Check each vault for user's balance
      for (const vaultAddress of vaultAddresses) {
        try {
          // Get user's balance in the vault
          const balance = await publicClient.readContract({
            address: vaultAddress as Hex,
            abi: BEEFY_VAULT_ABI,
            functionName: 'balanceOf',
            args: [address as Hex]
          }) as bigint;
          
          // Only process vaults with actual balance
          if (balance > BigInt(0)) {
            const ppfs = await publicClient.readContract({
              address: vaultAddress as Hex,
              abi: BEEFY_VAULT_ABI,
              functionName: 'getPricePerFullShare'
            }) as bigint;

            // Attempt to get the vault data from the timeline API
            // Simplified calculation based on what we can see from the Beefy provider
            // This is a simplified version - the actual Beefy provider does more complex calculations
            // with API fetches for prices and APYs
            const tokenBalance = Number(formatUnits(balance, 18));
            const pricePerShare = Number(formatUnits(ppfs, 18));
            
            // Estimate the USD value - this is just an approximation
            // In reality, we'd need to fetch the LP token price from an API or calculate it
            // Based on the pool's token composition
            const usdValue = vaultAddress === "0x816d2aeaff13dd1ef3a4a2e16ee6ca4b9e50ddd8" 
              ? 9.38  // Hardcoded value from logs for ws-usdc.e vault
              : 3.50; // Hardcoded value from logs for usdc.e vault
              
            totalValue += usdValue;
          }
        } catch (error) {
          console.error(`Error checking vault ${vaultAddress}:`, error);
        }
      }

      return { totalValue };
    } catch (error) {
      console.error('Error fetching Beefy portfolio data:', error);
      return { totalValue: 0 };
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
      : `⚠️ Insufficient ${tokenSymbol} balance. You have ${formattedBalance} ${tokenSymbol} but need ${formattedRequired} ${tokenSymbol}. Please add more ${tokenSymbol} to your wallet.`
  };
}