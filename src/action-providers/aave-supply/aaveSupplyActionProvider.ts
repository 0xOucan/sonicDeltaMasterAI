import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import { encodeFunctionData, createPublicClient, http, parseUnits, formatUnits } from "viem";
import type { Hex } from "viem";
import "reflect-metadata";
import { sonic } from 'viem/chains';

import {
  AAVE_POOL_ADDRESS,
  USDC_E_ADDRESS,
  WETH_ADDRESS,
  AAVE_POOL_ABI,
  ERC20_ABI,
  AAVE_WETH_GATEWAY,
  BORROWABLE_ASSETS,
} from "./constants";

import {
  SupplyUSDCeSchema,
  SupplyWETHSchema,
  ApproveUSDCeSchema,
  ApproveWETHSchema,
  WithdrawUSDCeSchema,
  WithdrawWETHSchema,
  BorrowSchema,
  RepaySchema,
} from "./schemas";

import { checkTokenBalance } from "../balance-checker/balanceCheckerActionProvider";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const EXPLORER_BASE_URL = "https://sonicscan.org/tx/";

// Update the type definition
type UserAccountData = readonly [
  totalCollateralBase: bigint,
  totalDebtBase: bigint,
  availableBorrowsBase: bigint,
  currentLiquidationThreshold: bigint,
  ltv: bigint,
  healthFactor: bigint
];

export class AaveSupplyActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("aave-supply", []);
  }

  @CreateAction({
    name: "aave-supply-usdce",
    description: "Supply USDC.e to Aave lending protocol (e.g., 'aave-supply-usdce 1.0')",
    schema: SupplyUSDCeSchema,
  })
  async supplyUSDCe(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SupplyUSDCeSchema>
  ): Promise<string> {
    try {
      const amount = parseUnits(args.amount, 6);
      const address = await walletProvider.getAddress();
      let response = `Executing Aave USDC.e supply strategy:\n\n`;

      // Step 1: Check balance
      const balanceCheck = await checkTokenBalance(
        walletProvider,
        USDC_E_ADDRESS,
        amount,
        "USDC.e",
        6
      );

      if (!balanceCheck.hasBalance) {
        return balanceCheck.message;
      }

      // Step 2: Approve USDC.e for Aave if needed
      try {
        const approveTx = await walletProvider.sendTransaction({
          to: USDC_E_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [AAVE_POOL_ADDRESS as Hex, amount],
          }),
        });

        response += `1. Approved ${args.amount} USDC.e for Aave protocol\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${approveTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(approveTx);
        await sleep(5000); // Wait for state updates
      } catch (error) {
        console.error('Approval error:', error);
        return `Failed to approve USDC.e: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      // Step 3: Supply to Aave
      try {
        const supplyTx = await walletProvider.sendTransaction({
          to: AAVE_POOL_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: AAVE_POOL_ABI,
            functionName: "supply",
            args: [USDC_E_ADDRESS as Hex, amount, address as Hex, 0],
          }),
          gas: BigInt(300000),
        });

        response += `2. Supplied ${args.amount} USDC.e to Aave\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${supplyTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(supplyTx);
        return response;
      } catch (error) {
        console.error('Supply error:', error);
        return `Failed to supply USDC.e to Aave: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } catch (error) {
      console.error('Strategy execution error:', error);
      return `Failed to execute strategy: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  @CreateAction({
    name: "aave-supply-weth",
    description: "Supply WETH to Aave lending protocol (e.g., 'aave-supply-weth 0.1')",
    schema: SupplyWETHSchema,
  })
  async supplyWETH(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SupplyWETHSchema>
  ): Promise<string> {
    try {
      const amount = parseUnits(args.amount, 18);
      const address = await walletProvider.getAddress();
      let response = `Executing Aave WETH supply strategy:\n\n`;

      // Step 1: Check balance
      const balanceCheck = await checkTokenBalance(
        walletProvider,
        WETH_ADDRESS,
        amount,
        "WETH",
        18
      );

      if (!balanceCheck.hasBalance) {
        return balanceCheck.message;
      }

      // Step 2: Approve WETH for Aave if needed
      try {
        const approveTx = await walletProvider.sendTransaction({
          to: WETH_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [AAVE_POOL_ADDRESS as Hex, amount],
          }),
        });

        response += `1. Approved ${args.amount} WETH for Aave protocol\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${approveTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(approveTx);
        await sleep(5000); // Wait for state updates
      } catch (error) {
        console.error('Approval error:', error);
        return `Failed to approve WETH: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      // Step 3: Supply to Aave
      try {
        const supplyTx = await walletProvider.sendTransaction({
          to: AAVE_POOL_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: AAVE_POOL_ABI,
            functionName: "supply",
            args: [WETH_ADDRESS as Hex, amount, address as Hex, 0],
          }),
          gas: BigInt(300000),
        });

        response += `2. Supplied ${args.amount} WETH to Aave\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${supplyTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(supplyTx);
        return response;
      } catch (error) {
        console.error('Supply error:', error);
        return `Failed to supply WETH to Aave: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } catch (error) {
      console.error('Strategy execution error:', error);
      return `Failed to execute strategy: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  @CreateAction({
    name: "aave-withdraw-usdce",
    description: "Withdraw USDC.e from Aave lending protocol (e.g., 'aave-withdraw-usdce 1.0' or 'aave-withdraw-usdce max')",
    schema: WithdrawUSDCeSchema,
  })
  async withdrawUSDCe(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof WithdrawUSDCeSchema>
  ): Promise<string> {
    try {
      const amount = parseUnits(args.amount, 6);
      const address = await walletProvider.getAddress();
      let response = `Executing Aave USDC.e withdrawal:\n\n`;

      try {
        const withdrawTx = await walletProvider.sendTransaction({
          to: AAVE_POOL_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: AAVE_POOL_ABI,
            functionName: "withdraw",
            args: [USDC_E_ADDRESS as Hex, amount, address as Hex],
          }),
          gas: BigInt(300000),
        });

        response += `Withdrew ${args.amount} USDC.e from Aave\n` +
                    `Transaction: ${EXPLORER_BASE_URL}${withdrawTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(withdrawTx);
        return response;
      } catch (error) {
        console.error('Withdrawal error:', error);
        return `Failed to withdraw USDC.e from Aave: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } catch (error) {
      console.error('Strategy execution error:', error);
      return `Failed to execute strategy: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  @CreateAction({
    name: "aave-withdraw-weth",
    description: "Withdraw WETH from Aave lending protocol (e.g., 'aave-withdraw-weth 0.1' or 'aave-withdraw-weth max')",
    schema: WithdrawWETHSchema,
  })
  async withdrawWETH(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof WithdrawWETHSchema>
  ): Promise<string> {
    try {
      const amount = parseUnits(args.amount, 18);
      const address = await walletProvider.getAddress();
      let response = `Executing Aave WETH withdrawal:\n\n`;

      try {
        const withdrawTx = await walletProvider.sendTransaction({
          to: AAVE_POOL_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: AAVE_POOL_ABI,
            functionName: "withdraw",
            args: [WETH_ADDRESS as Hex, amount, address as Hex],
          }),
          gas: BigInt(300000),
        });

        response += `Withdrew ${args.amount} WETH from Aave\n` +
                    `Transaction: ${EXPLORER_BASE_URL}${withdrawTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(withdrawTx);
        return response;
      } catch (error) {
        console.error('Withdrawal error:', error);
        return `Failed to withdraw WETH from Aave: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } catch (error) {
      console.error('Strategy execution error:', error);
      return `Failed to execute strategy: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  @CreateAction({
    name: "borrow-from-aave",
    description: "Borrow assets from Aave using your supplied collateral",
    schema: BorrowSchema,
  })
  async borrowFromAave(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof BorrowSchema>
  ): Promise<string> {
    try {
      const address = await walletProvider.getAddress();
      const assetAddress = BORROWABLE_ASSETS[args.asset];
      
      const publicClient = createPublicClient({
        chain: sonic,
        transport: http()
      });

      // Get user account data with proper typing
      const accountData = await publicClient.readContract({
        address: AAVE_POOL_ADDRESS as Hex,
        abi: AAVE_POOL_ABI,
        functionName: 'getUserAccountData',
        args: [address as Hex]
      }) as UserAccountData;

      // Destructure the array to get the values we need
      const [,, availableBorrowsBase] = accountData;

      if (availableBorrowsBase === 0n) {
        return "You don't have enough collateral to borrow. Please supply assets first.";
      }

      // Convert amount to proper units based on asset
      const decimals = args.asset === 'USDC_E' ? 6 : 18;
      const amount = parseUnits(args.amount, decimals);

      // Execute borrow transaction
      const borrowTx = await walletProvider.sendTransaction({
        to: AAVE_POOL_ADDRESS,
        data: encodeFunctionData({
          abi: AAVE_POOL_ABI,
          functionName: 'borrow',
          args: [
            assetAddress as Hex,
            amount,
            2n, // Variable rate mode
            0, // referral code
            address as Hex
          ]
        })
      });

      await walletProvider.waitForTransactionReceipt(borrowTx);

      return `✅ Successfully borrowed ${args.amount} ${args.asset}\n` +
             `📝 Transaction: ${EXPLORER_BASE_URL}${borrowTx}`;

    } catch (error) {
      console.error('Borrow error:', error);
      return `❌ Failed to borrow: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  @CreateAction({
    name: "repay-to-aave",
    description: "Repay borrowed assets to Aave",
    schema: RepaySchema,
  })
  async repayToAave(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof RepaySchema>
  ): Promise<string> {
    try {
      const address = await walletProvider.getAddress();
      const assetAddress = BORROWABLE_ASSETS[args.asset];
      const decimals = args.asset === 'USDC_E' ? 6 : 18;
      const amount = parseUnits(args.amount, decimals);

      // First approve spending if needed
      const approveTx = await walletProvider.sendTransaction({
        to: assetAddress,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [AAVE_POOL_ADDRESS as Hex, amount]
        })
      });

      await walletProvider.waitForTransactionReceipt(approveTx);

      // Execute repay transaction
      const repayTx = await walletProvider.sendTransaction({
        to: AAVE_POOL_ADDRESS,
        data: encodeFunctionData({
          abi: AAVE_POOL_ABI,
          functionName: 'repay',
          args: [
            assetAddress as Hex,
            amount,
            2n, // Variable rate mode
            address as Hex
          ]
        })
      });

      await walletProvider.waitForTransactionReceipt(repayTx);

      return `✅ Successfully repaid ${args.amount} ${args.asset}\n` +
             `📝 Transaction: ${EXPLORER_BASE_URL}${repayTx}`;

    } catch (error) {
      console.error('Repay error:', error);
      return `❌ Failed to repay: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  @CreateAction({
    name: "check-borrowing-power",
    description: "Check how much you can borrow from Aave",
    schema: z.object({}).strip(),
  })
  async checkBorrowingPower(
    walletProvider: EvmWalletProvider
  ): Promise<string> {
    try {
      const address = await walletProvider.getAddress();
      const publicClient = createPublicClient({
        chain: sonic,
        transport: http()
      });

      const accountData = await publicClient.readContract({
        address: AAVE_POOL_ADDRESS as Hex,
        abi: AAVE_POOL_ABI,
        functionName: 'getUserAccountData',
        args: [address as Hex]
      }) as UserAccountData;

      const [
        totalCollateralBase,
        totalDebtBase,
        availableBorrowsBase,
        currentLiquidationThreshold,
        ltv,
        healthFactor
      ] = accountData;

      // Format values to match UI
      const totalCollateralUSD = Number(formatUnits(totalCollateralBase, 8)).toFixed(2);
      const totalDebtUSD = Number(formatUnits(totalDebtBase, 8)).toFixed(2);
      const availableBorrowUSD = Number(formatUnits(availableBorrowsBase, 8)).toFixed(2);
      
      // Calculate max borrowable for each asset
      const maxUSDCe = availableBorrowUSD; // 1:1 with USD
      const maxWETH = (Number(availableBorrowUSD) / 2150).toFixed(6); // WETH price ~$2150
      const maxS = (Number(availableBorrowUSD) / 0.57).toFixed(2); // S price ~$0.57

      return `Aave Borrowing Power Summary:\n\n` +
             `Total Position:\n` +
             `• Collateral: $${totalCollateralUSD}\n` +
             `• Current Debt: $${totalDebtUSD}\n` +
             `• Available to Borrow: $${availableBorrowUSD}\n\n` +
             `Maximum Borrowable by Asset:\n` +
             `• USDC.e: ${maxUSDCe} ($${availableBorrowUSD})\n` +
             `• WETH: ${maxWETH} ($${availableBorrowUSD})\n` +
             `• S: ${maxS} ($${availableBorrowUSD})\n\n` +
             `Current Rates:\n` +
             `• USDC.e: 3.19% APY\n` +
             `• S: 1.06% APY\n` +
             `• WETH: 0.06% APY\n\n` +
             `Health Factor: ${Number(formatUnits(healthFactor, 18)).toFixed(2)}`;

    } catch (error) {
      console.error('Error checking borrowing power:', error);
      return `Failed to check borrowing power: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  @CreateAction({
    name: "check-max-borrowable",
    description: "Check maximum borrowable amount for a specific asset",
    schema: z.object({
      asset: z.enum(["USDC_E", "WETH", "WS"])
    }),
  })
  async checkMaxBorrowable(
    walletProvider: EvmWalletProvider,
    args: { asset: "USDC_E" | "WETH" | "WS" }
  ): Promise<string> {
    try {
      const address = await walletProvider.getAddress();
      const publicClient = createPublicClient({
        chain: sonic,
        transport: http()
      });

      const accountData = await publicClient.readContract({
        address: AAVE_POOL_ADDRESS as Hex,
        abi: AAVE_POOL_ABI,
        functionName: 'getUserAccountData',
        args: [address as Hex]
      }) as UserAccountData;

      const [,, availableBorrowsBase,,,healthFactor] = accountData;

      // Convert available borrows to asset amount based on price
      const decimals = args.asset === 'USDC_E' ? 6 : 18;
      const maxBorrowUSD = formatUnits(availableBorrowsBase, 18);
      
      // Get asset price and calculate max borrowable
      let maxBorrowAmount: string;
      if (args.asset === 'USDC_E') {
        maxBorrowAmount = maxBorrowUSD; // USDC.e is pegged to USD
      } else if (args.asset === 'WETH') {
        // Assuming WETH price is ~$2150
        maxBorrowAmount = (Number(maxBorrowUSD) / 2150).toFixed(6);
      } else {
        // Assuming wS price is ~$0.57
        maxBorrowAmount = (Number(maxBorrowUSD) / 0.57).toFixed(6);
      }

      return `Maximum Borrowable ${args.asset}:\n` +
             `Amount: ${maxBorrowAmount} ${args.asset}\n` +
             `USD Value: $${maxBorrowUSD}\n` +
             `Current Health Factor: ${formatUnits(healthFactor, 18)}`;

    } catch (error) {
      console.error('Error checking max borrowable:', error);
      return `Failed to check max borrowable: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  @CreateAction({
    name: "aave-dashboard",
    description: "View complete Aave lending dashboard with all positions and metrics",
    schema: z.object({}).strip(),
  })
  async aaveDashboard(
    walletProvider: EvmWalletProvider
  ): Promise<string> {
    return this.generateAaveDashboard(walletProvider);
  }

  @CreateAction({
    name: "aave-positions",
    description: "View your Aave lending positions and metrics",
    schema: z.object({}).strip(),
  })
  async aavePositions(
    walletProvider: EvmWalletProvider
  ): Promise<string> {
    return this.generateAaveDashboard(walletProvider);
  }

  @CreateAction({
    name: "lending-dashboard",
    description: "Show your lending dashboard with all positions and metrics",
    schema: z.object({}).strip(),
  })
  async lendingDashboard(
    walletProvider: EvmWalletProvider
  ): Promise<string> {
    return this.generateAaveDashboard(walletProvider);
  }

  @CreateAction({
    name: "lending-protocol",
    description: "View your positions in the Aave lending protocol",
    schema: z.object({}).strip(),
  })
  async lendingProtocol(
    walletProvider: EvmWalletProvider
  ): Promise<string> {
    return this.generateAaveDashboard(walletProvider);
  }

  // Private helper method that contains the actual dashboard generation code
  private async generateAaveDashboard(
    walletProvider: EvmWalletProvider
  ): Promise<string> {
    try {
      const address = await walletProvider.getAddress();
      const publicClient = createPublicClient({
        chain: sonic,
        transport: http()
      });

      // Get user account data
      const accountData = await publicClient.readContract({
        address: AAVE_POOL_ADDRESS as Hex,
        abi: AAVE_POOL_ABI,
        functionName: 'getUserAccountData',
        args: [address as Hex]
      }) as UserAccountData;

      const [
        totalCollateralBase,
        totalDebtBase,
        availableBorrowsBase,
        currentLiquidationThreshold,
        ltv,
        healthFactor
      ] = accountData;

      // Format values to match UI
      const totalCollateralUSD = Number(formatUnits(totalCollateralBase, 8)).toFixed(2);
      const totalDebtUSD = Number(formatUnits(totalDebtBase, 8)).toFixed(2);
      const availableBorrowUSD = Number(formatUnits(availableBorrowsBase, 8)).toFixed(2);
      
      // Get supplied assets (aTokens)
      const tokens = {
        "USDC.e": {
          aToken: "0x578Ee1ca3a8E1b54554Da1Bf7C583506C4CD11c6",
          decimals: 6,
          supplyAPY: 0.86,
          borrowAPY: 3.21
        },
        "WETH": {
          aToken: "0xe18Ab82c81E7Eecff32B8A82B1b7d2d23F1EcE96",
          decimals: 18,
          supplyAPY: 0.01,
          borrowAPY: 0.04
        }
      };

      // Calculate supplied assets and debt positions
      let suppliedAssets = [];
      let borrowedAssets = [];
      let totalSupplyAPY = 0;
      let totalBorrowAPY = 0;
      let weightedSupplyAPY = 0;
      let weightedBorrowAPY = 0;
      
      // Check supplied assets
      for (const [symbol, info] of Object.entries(tokens)) {
        try {
          // Check supplied amount (aToken balance)
          const suppliedBalance = await publicClient.readContract({
            address: info.aToken as Hex,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [address as Hex],
          });
          
          const suppliedAmount = Number(formatUnits(suppliedBalance, info.decimals));
          const suppliedUSD = suppliedAmount * (symbol === "USDC.e" ? 1 : symbol === "WETH" ? 2150 : 0.57);
          
          if (suppliedAmount > 0) {
            suppliedAssets.push({
              symbol,
              amount: suppliedAmount,
              usdValue: suppliedUSD,
              apy: info.supplyAPY
            });
            
            weightedSupplyAPY += (suppliedUSD / Number(totalCollateralUSD)) * info.supplyAPY;
          }
          
          // Check borrowed amount for the asset
          if (symbol === "USDC.e") {
            const borrowedAmount = Number(totalDebtUSD); // Simplified - assuming only USDC.e borrowed
            if (borrowedAmount > 0) {
              borrowedAssets.push({
                symbol,
                amount: borrowedAmount,
                usdValue: borrowedAmount,
                apy: info.borrowAPY
              });
              
              weightedBorrowAPY += info.borrowAPY;
            }
          }
        } catch (error) {
          console.error(`Error fetching ${symbol} positions:`, error);
        }
      }
      
      // Calculate Net APY
      const netAPY = Number(totalCollateralUSD) > 0 ? 
        weightedSupplyAPY - (Number(totalDebtUSD) / Number(totalCollateralUSD)) * weightedBorrowAPY :
        0;
      
      // Format the dashboard output
      let dashboard = `### 📊 AAVE LENDING DASHBOARD\n\n`;
      
      // Overview section
      dashboard += `#### OVERVIEW\n`;
      dashboard += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      dashboard += `- **Net Worth**: $${(Number(totalCollateralUSD) - Number(totalDebtUSD)).toFixed(2)}\n`;
      dashboard += `- **Net APY**: ${netAPY.toFixed(2)}%\n`;
      dashboard += `- **Health Factor**: ${Number(formatUnits(healthFactor, 18)) > 1000 ? "∞" : Number(formatUnits(healthFactor, 18)).toFixed(2)}\n\n`;
      
      // Supplied assets section
      dashboard += `#### SUPPLIED ASSETS\n`;
      dashboard += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      dashboard += `- **Total Balance**: $${totalCollateralUSD}   |   **APY**: ${weightedSupplyAPY.toFixed(2)}%\n\n`;
      
      if (suppliedAssets.length > 0) {
        for (const asset of suppliedAssets) {
          const emoji = asset.symbol === "USDC.e" ? "💵" : asset.symbol === "WETH" ? "💎" : "🪙";
          dashboard += `  - **${emoji} ${asset.symbol}**: ${asset.amount.toFixed(asset.symbol === "USDC.e" ? 2 : 6)} ($${asset.usdValue.toFixed(2)}) - APY: ${asset.apy}%\n`;
        }
      } else {
        dashboard += `  - No supplied assets\n`;
      }
      
      dashboard += `\n`;
      
      // Borrowed assets section
      dashboard += `#### BORROWED ASSETS\n`;
      dashboard += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      dashboard += `- **Total Balance**: $${totalDebtUSD}   |   **APY**: -${weightedBorrowAPY.toFixed(2)}%\n\n`;
      
      if (borrowedAssets.length > 0) {
        for (const asset of borrowedAssets) {
          const emoji = asset.symbol === "USDC.e" ? "💵" : asset.symbol === "WETH" ? "💎" : asset.symbol === "wS" ? "🌀" : "🪙";
          dashboard += `  - **${emoji} ${asset.symbol}**: ${asset.amount.toFixed(asset.symbol === "USDC.e" ? 2 : 6)} ($${asset.usdValue.toFixed(2)}) - APY: -${asset.apy}%\n`;
        }
      } else {
        dashboard += `  - No borrowed assets\n`;
      }
      
      dashboard += `\n`;
      
      // Borrowing power section
      dashboard += `#### BORROWING POWER\n`;
      dashboard += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      dashboard += `- **Available**: $${availableBorrowUSD}\n\n`;
      dashboard += `  - **💵 USDC.e**: ${availableBorrowUSD} ($${availableBorrowUSD})\n`;
      dashboard += `  - **💎 WETH**: ${(Number(availableBorrowUSD) / 2150).toFixed(6)} ($${availableBorrowUSD})\n`;
      dashboard += `  - **🪙 S**: ${(Number(availableBorrowUSD) / 0.57).toFixed(2)} ($${availableBorrowUSD})\n`;
      
      return dashboard;

    } catch (error) {
      console.error('Error generating Aave dashboard:', error);
      return `Failed to generate Aave dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  supportsNetwork = (network: Network) => network.protocolFamily === "evm";
}