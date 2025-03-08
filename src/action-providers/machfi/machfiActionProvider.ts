import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import { 
  encodeFunctionData, 
  createPublicClient, 
  http, 
  parseUnits,
  formatUnits,
  type Hex 
} from "viem";
import { sonic } from 'viem/chains';
import "reflect-metadata";

import {
  MACHFI_ADDRESSES,
  TOKEN_ADDRESSES,
  CTOKEN_ABI,
  COMPTROLLER_ABI,
  ERC20_ABI,
  PRICE_ORACLE_ABI,
  TOKEN_PRICE_USD,
  SECONDS_PER_YEAR,
  ASSET_MARKETS,
  TOKEN_INFO
} from "./constants";

import {
  SupplyUSDCeSchema,
  SupplySSchema,
  BorrowSchema,
  RepaySchema,
  WithdrawSchema,
} from "./schemas";

import { checkTokenBalance } from "../balance-checker/balanceCheckerActionProvider";

const EXPLORER_BASE_URL = "https://sonicscan.org/tx/";
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Function to calculate APR from per-timestamp rate
const calculateAPR = (ratePerTimestamp: bigint): number => {
  const ratePerYear = Number(ratePerTimestamp) * SECONDS_PER_YEAR;
  return (ratePerYear / 1e18) * 100; // Convert to percentage
};

// Helper function to safely access TOKEN_INFO with type checking
function getTokenInfo(assetKey: string) {
  // Check if assetKey is a valid key in TOKEN_INFO
  if (assetKey in TOKEN_INFO) {
    return TOKEN_INFO[assetKey as keyof typeof TOKEN_INFO];
  }
  // Return default token info if not found
  return { symbol: "Unknown", decimals: 18, icon: "🪙" };
}

export class MachFiActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("machfi", []);
  }

  @CreateAction({
    name: "machfi-supply-usdce",
    description: "Supply USDC.e to MachFi lending protocol (e.g., 'machfi-supply-usdce 1.0')",
    schema: SupplyUSDCeSchema,
  })
  async supplyUSDCe(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SupplyUSDCeSchema>
  ): Promise<string> {
    try {
      const amount = parseUnits(args.amount, 6); // USDC.e has 6 decimals
      const address = await walletProvider.getAddress();
      let response = `Executing MachFi USDC.e supply strategy:\n\n`;

      // Check USDC.e balance
      try {
        // Use the correct API for balance checker
        const balanceCheck = await checkTokenBalance(
          walletProvider,
          TOKEN_ADDRESSES.USDC_E,
          amount,
          "USDC.e",
          6
        );
        
        if (!balanceCheck.hasBalance) {
          return balanceCheck.message;
        }
        
        response += `1. Checking USDC.e balance: ${formatUnits(balanceCheck.currentBalance, 6)} USDC.e ✓\n\n`;
      } catch (error) {
        console.error('Balance check error:', error);
        return `Error checking balance: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      // Approve USDC.e to be used by MachFi cUSDC contract
      try {
        const approveTx = await walletProvider.sendTransaction({
          to: TOKEN_ADDRESSES.USDC_E as Hex,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [MACHFI_ADDRESSES.CUSDC as Hex, amount],
          }),
          gas: BigInt(100000),
        });

        response += `1. Approved USDC.e spending for MachFi\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${approveTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(approveTx);

        // Supply USDC.e to MachFi
        const supplyTx = await walletProvider.sendTransaction({
          to: MACHFI_ADDRESSES.CUSDC as Hex,
          data: encodeFunctionData({
            abi: CTOKEN_ABI,
            functionName: "mintAsCollateral",
            args: [amount],
          }),
          gas: BigInt(300000),
        });

        response += `2. Supplied ${args.amount} USDC.e to MachFi\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${supplyTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(supplyTx);
        response += `Successfully supplied ${args.amount} USDC.e to MachFi. You are now earning interest on your deposit.`;
        return response;
      } catch (error) {
        console.error('Supply error:', error);
        return `Failed to supply to MachFi: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } catch (error) {
      console.error('SupplyUSDCe error:', error);
      return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  @CreateAction({
    name: "machfi-supply-s",
    description: "Supply native S tokens to MachFi lending protocol (e.g., 'machfi-supply-s 10.0')",
    schema: SupplySSchema,
  })
  async supplyS(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SupplySSchema>
  ): Promise<string> {
    try {
      const amount = parseUnits(args.amount, 18);
      const address = await walletProvider.getAddress();
      let response = `Executing MachFi S supply strategy:\n\n`;

      // Check native S balance
      const publicClient = createPublicClient({
        chain: sonic,
        transport: http()
      });
      
      const balance = await publicClient.getBalance({
        address: address as Hex
      });
      
      if (balance < amount) {
        return `Insufficient S balance. Required: ${formatUnits(amount, 18)}, Available: ${formatUnits(balance, 18)}`;
      }

      // Supply S directly to cSonic contract using mintAsCollateral
      try {
        const supplyTx = await walletProvider.sendTransaction({
          to: MACHFI_ADDRESSES.CSONIC as Hex,
          data: encodeFunctionData({
            abi: CTOKEN_ABI,
            functionName: "mintAsCollateral",
          }),
          value: amount,
          gas: BigInt(300000),
        });

        response += `📥 Supplied ${args.amount} S to MachFi\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${supplyTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(supplyTx);
        response += `✅ Successfully supplied ${args.amount} S to MachFi. You are now earning interest on your deposit.`;
        return response;
      } catch (error) {
        console.error('Supply error:', error);
        return `Failed to supply S to MachFi: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } catch (error) {
      console.error('SupplyS error:', error);
      return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  @CreateAction({
    name: "machfi-borrow",
    description: "Borrow assets from MachFi lending protocol",
    schema: BorrowSchema,
  })
  async borrow(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof BorrowSchema>
  ): Promise<string> {
    try {
      const address = await walletProvider.getAddress();
      const publicClient = createPublicClient({
        chain: sonic,
        transport: http()
      });

      // Get account liquidity first
      const [errorCode, liquidity] = await publicClient.readContract({
        address: MACHFI_ADDRESSES.COMPTROLLER as Hex,
        abi: COMPTROLLER_ABI,
        functionName: "getAccountLiquidity",
        args: [address as Hex]
      }) as [bigint, bigint, bigint];

      if (errorCode !== BigInt(0)) {
        return `Failed to get account liquidity. Error code: ${errorCode}`;
      }

      // Convert amount based on asset
      const decimals = args.asset === "USDC_E" ? 6 : 18;
      const amount = parseUnits(args.amount, decimals);
      const borrowMarket = args.asset === "USDC_E" ? 
        MACHFI_ADDRESSES.CUSDC : 
        MACHFI_ADDRESSES.CSONIC;

      // Check if borrow amount is within limits
      if (liquidity < amount) {
        return `Insufficient borrowing power. Available: ${formatUnits(liquidity, decimals)} ${args.asset}`;
      }

      let response = `Executing MachFi borrow strategy:\n\n`;

      // Execute borrow
      try {
        const borrowTx = await walletProvider.sendTransaction({
          to: borrowMarket as Hex,
          data: encodeFunctionData({
            abi: CTOKEN_ABI,
            functionName: "borrow",
            args: [amount],
          }),
          gas: BigInt(500000),
        });

        response += `📤 Borrowed ${args.amount} ${args.asset} from MachFi\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${borrowTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(borrowTx);
        response += `✅ Successfully borrowed ${args.amount} ${args.asset} from MachFi.`;
        return response;
      } catch (error) {
        console.error('Borrow error:', error);
        return `Failed to borrow from MachFi: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } catch (error) {
      console.error('Strategy execution error:', error);
      return `Failed to execute borrow: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  @CreateAction({
    name: "machfi-dashboard",
    description: "Show your MachFi lending dashboard with positions, APRs, and account metrics",
    schema: z.object({}).strip(),
  })
  async machfiDashboard(
    walletProvider: EvmWalletProvider
  ): Promise<string> {
    try {
      const address = await walletProvider.getAddress();
      const publicClient = createPublicClient({
        chain: sonic,
        transport: http()
      });

      // Get account liquidity info
      const [errorCode, liquidity, shortfall] = await publicClient.readContract({
        address: MACHFI_ADDRESSES.COMPTROLLER as Hex,
        abi: COMPTROLLER_ABI,
        functionName: "getAccountLiquidity",
        args: [address as Hex]
      }) as [bigint, bigint, bigint];

      // Get market data for each asset
      const marketData: Record<string, any> = {};
      let totalSuppliedUSD = 0;
      let totalBorrowedUSD = 0;
      let weightedSupplyAPY = 0;
      let weightedBorrowAPY = 0;

      // Fetch data for each market
      for (const [assetKey, marketInfo] of Object.entries(ASSET_MARKETS)) {
        const cTokenAddress = marketInfo.cToken as Hex;
        
        // Get exchange rate
        const exchangeRate = await publicClient.readContract({
          address: cTokenAddress,
          abi: CTOKEN_ABI,
          functionName: "exchangeRateStored",
        }) as bigint;

        // Get supply and borrow rates
        const supplyRate = await publicClient.readContract({
          address: cTokenAddress,
          abi: CTOKEN_ABI,
          functionName: "supplyRatePerTimestamp",
        }) as bigint;
        
        const borrowRate = await publicClient.readContract({
          address: cTokenAddress,
          abi: CTOKEN_ABI,
          functionName: "borrowRatePerTimestamp",
        }) as bigint;

        // Get user's cToken balance
        const cTokenBalance = await publicClient.readContract({
          address: cTokenAddress,
          abi: CTOKEN_ABI,
          functionName: "balanceOf",
          args: [address as Hex]
        }) as bigint;

        // Get borrow balance
        const borrowBalance = await publicClient.readContract({
          address: cTokenAddress,
          abi: CTOKEN_ABI,
          functionName: "borrowBalanceStored",
          args: [address as Hex]
        }) as bigint;

        // Calculate actual token amounts
        const tokenBalance = (cTokenBalance * exchangeRate) / BigInt(1e18);
        const tokenFormatted = formatUnits(tokenBalance, marketInfo.decimals);
        const borrowFormatted = formatUnits(borrowBalance, marketInfo.decimals);

        // Calculate APRs
        const supplyAPR = calculateAPR(supplyRate);
        const borrowAPR = calculateAPR(borrowRate);

        // Get price from oracle
        const price = await publicClient.readContract({
          address: MACHFI_ADDRESSES.PRICE_ORACLE as Hex,
          abi: PRICE_ORACLE_ABI,
          functionName: "getUnderlyingPrice",
          args: [cTokenAddress]
        }) as bigint;

        const priceUSD = Number(formatUnits(price, 36 - marketInfo.decimals));
        const supplyUsdValue = Number(tokenFormatted) * priceUSD;
        const borrowUsdValue = Number(borrowFormatted) * priceUSD;

        // Update totals
        if (supplyUsdValue > 0) {
          totalSuppliedUSD += supplyUsdValue;
          weightedSupplyAPY += (supplyUsdValue / totalSuppliedUSD) * supplyAPR;
        }

        if (borrowUsdValue > 0) {
          totalBorrowedUSD += borrowUsdValue;
          weightedBorrowAPY += (borrowUsdValue / totalBorrowedUSD) * borrowAPR;
        }

        marketData[assetKey] = {
          tokenBalance,
          tokenFormatted,
          borrowBalance,
          borrowFormatted,
          supplyAPR,
          borrowAPR,
          priceUSD,
          supplyUsdValue,
          borrowUsdValue,
          symbol: marketInfo.symbol,
          icon: getTokenInfo(assetKey).icon
        };
      }

      // Calculate net APY
      const netAPY = totalSuppliedUSD > 0 ? 
        weightedSupplyAPY - (totalBorrowedUSD / totalSuppliedUSD) * weightedBorrowAPY : 
        0;

      // Format dashboard output
      let dashboard = `### 📊 MACHFI LENDING DASHBOARD\n\n`;
      
      dashboard += `#### 📈 OVERVIEW\n`;
      dashboard += `- 💰 **Net Worth:** $${(totalSuppliedUSD - totalBorrowedUSD).toFixed(2)}\n`;
      dashboard += `- 💵 **Net APY:** ${netAPY.toFixed(2)}%\n`;
      dashboard += `- ❤️ **Health Factor:** ${shortfall > 0n ? "UNSAFE" : "SAFE"}\n\n`;

      dashboard += `#### 💎 SUPPLIED ASSETS\n`;
      dashboard += `- 💰 **Total Balance:** $${totalSuppliedUSD.toFixed(2)} (APY: ${weightedSupplyAPY.toFixed(2)}%)\n`;

      for (const [assetKey, data] of Object.entries(marketData)) {
        if (data.supplyUsdValue > 0) {
          dashboard += `  - ${data.icon} **${data.symbol}:** ${Number(data.tokenFormatted).toFixed(6)} ($${data.supplyUsdValue.toFixed(2)}) - APY: ${data.supplyAPR.toFixed(2)}%\n`;
        }
      }

      dashboard += `\n#### 🏦 BORROWED ASSETS\n`;
      dashboard += `- 💸 **Total Balance:** $${totalBorrowedUSD.toFixed(2)} (APY: ${weightedBorrowAPY.toFixed(2)}%)\n`;

      for (const [assetKey, data] of Object.entries(marketData)) {
        if (data.borrowUsdValue > 0) {
          dashboard += `  - ${data.icon} **${data.symbol}:** ${Number(data.borrowFormatted).toFixed(6)} ($${data.borrowUsdValue.toFixed(2)}) - APY: ${data.borrowAPR.toFixed(2)}%\n`;
        }
      }

      // Add borrowing power section
      const borrowLimit = totalSuppliedUSD * 0.8; // Using 80% as example LTV
      const borrowAvailable = borrowLimit - totalBorrowedUSD;
      const riskLevel = borrowLimit > 0 ? (totalBorrowedUSD / borrowLimit) * 100 : 0;

      dashboard += `\n#### 💪 BORROWING POWER\n`;
      dashboard += `- 📊 **Available:** $${borrowAvailable.toFixed(2)}\n`;
      
      for (const [assetKey, data] of Object.entries(marketData)) {
        const availableInAsset = borrowAvailable / data.priceUSD;
        dashboard += `  - ${data.icon} **${data.symbol}:** ${availableInAsset.toFixed(6)} ($${borrowAvailable.toFixed(2)})\n`;
      }

      // Add wallet balances
      dashboard += `\n#### 💼 WALLET BALANCE\n`;
      
      // Get native S balance
      const nativeBalance = await publicClient.getBalance({
        address: address as Hex
      });
      dashboard += `- 🔷 **S:** ${formatUnits(nativeBalance, 18)}\n`;

      // Get other token balances
      for (const [assetKey, marketInfo] of Object.entries(ASSET_MARKETS)) {
        if (marketInfo.underlying !== TOKEN_ADDRESSES.S) {
          const balance = await publicClient.readContract({
            address: marketInfo.underlying as Hex,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [address as Hex]
          }) as bigint;
          
          const formattedBalance = formatUnits(balance, marketInfo.decimals);
          dashboard += `- ${getTokenInfo(assetKey).icon} **${marketInfo.symbol}:** ${formattedBalance}\n`;
        }
      }

      return dashboard;

    } catch (error) {
      console.error('Error generating dashboard:', error);
      return `Failed to generate MachFi dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  @CreateAction({
    name: "machfi-repay",
    description: "Repay borrowed assets to MachFi lending protocol",
    schema: RepaySchema,
  })
  async repay(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof RepaySchema>
  ): Promise<string> {
    try {
      const address = await walletProvider.getAddress();
      const decimals = args.asset === "USDC_E" ? 6 : 18;
      const amount = parseUnits(args.amount, decimals);
      const repayMarket = args.asset === "USDC_E" ? 
        MACHFI_ADDRESSES.CUSDC : 
        MACHFI_ADDRESSES.CSONIC;

      let response = `Executing MachFi repay strategy:\n\n`;

      if (args.asset === "USDC_E") {
        // For USDC.e, need to approve first
        try {
          const approveTx = await walletProvider.sendTransaction({
            to: TOKEN_ADDRESSES.USDC_E as Hex,
            data: encodeFunctionData({
              abi: ERC20_ABI,
              functionName: "approve",
              args: [repayMarket as Hex, amount],
            }),
          });

          response += `1. Approved ${args.amount} USDC.e for repayment\n` +
                      `   Transaction: ${EXPLORER_BASE_URL}${approveTx}\n\n`;

          await walletProvider.waitForTransactionReceipt(approveTx);
          await sleep(3000);
        } catch (error) {
          console.error('Approval error:', error);
          return `Failed to approve USDC.e: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }

        // Repay USDC.e
        try {
          const repayTx = await walletProvider.sendTransaction({
            to: repayMarket as Hex,
            data: encodeFunctionData({
              abi: CTOKEN_ABI,
              functionName: "repayBorrow",
              args: [amount],
            }),
            gas: BigInt(300000),
          });

          response += `2. Repaid ${args.amount} USDC.e to MachFi\n` +
                      `   Transaction: ${EXPLORER_BASE_URL}${repayTx}`;
          
          await walletProvider.waitForTransactionReceipt(repayTx);
          return response;
        } catch (error) {
          console.error('Repay error:', error);
          return `Failed to repay USDC.e: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      } else {
        // For native S, use payable repayBorrow
        try {
          const repayTx = await walletProvider.sendTransaction({
            to: repayMarket as Hex,
            data: encodeFunctionData({
              abi: CTOKEN_ABI,
              functionName: "repayBorrow",
              args: [BigInt(0)],
            }),
            value: amount,
            gas: BigInt(300000),
          });

          response += `Repaid ${args.amount} S to MachFi\n` +
                      `Transaction: ${EXPLORER_BASE_URL}${repayTx}`;
          
          await walletProvider.waitForTransactionReceipt(repayTx);
          return response;
        } catch (error) {
          console.error('Repay error:', error);
          return `Failed to repay S: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    } catch (error) {
      console.error('Strategy execution error:', error);
      return `Failed to execute repay: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  @CreateAction({
    name: "machfi-withdraw",
    description: "Withdraw supplied assets from MachFi lending protocol",
    schema: WithdrawSchema,
  })
  async withdraw(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof WithdrawSchema>
  ): Promise<string> {
    try {
      const address = await walletProvider.getAddress();
      const decimals = args.asset === "USDC_E" ? 6 : 18;
      const amount = parseUnits(args.amount, decimals);
      const withdrawMarket = args.asset === "USDC_E" ? 
        MACHFI_ADDRESSES.CUSDC : 
        MACHFI_ADDRESSES.CSONIC;

      // Check if user has enough balance to withdraw
      const publicClient = createPublicClient({
        chain: sonic,
        transport: http()
      });

      const cTokenBalance = await publicClient.readContract({
        address: withdrawMarket as Hex,
        abi: CTOKEN_ABI,
        functionName: "balanceOf",
        args: [address as Hex]
      });

      if (cTokenBalance < amount) {
        return `Insufficient ${args.asset} balance to withdraw. Available: ${formatUnits(cTokenBalance, decimals)}`;
      }

      let response = `Executing MachFi withdraw strategy:\n\n`;

      try {
        const withdrawTx = await walletProvider.sendTransaction({
          to: withdrawMarket as Hex,
          data: encodeFunctionData({
            abi: CTOKEN_ABI,
            functionName: "redeem",
            args: [amount],
          }),
          gas: BigInt(400000),
        });

        response += `Withdrew ${args.amount} ${args.asset} from MachFi\n` +
                    `Transaction: ${EXPLORER_BASE_URL}${withdrawTx}`;

        await walletProvider.waitForTransactionReceipt(withdrawTx);
        return response;
      } catch (error) {
        console.error('Withdraw error:', error);
        return `Failed to withdraw from MachFi: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } catch (error) {
      console.error('Strategy execution error:', error);
      return `Failed to execute withdraw: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  supportsNetwork(network: Network): boolean {
    return network.protocolFamily === "evm";
  }
} 