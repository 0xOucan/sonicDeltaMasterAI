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
import * as ethers from 'ethers';
import { InsufficientBalanceError } from "./errors";

import {
  AAVE_POOL_ADDRESS,
  USDC_E_ADDRESS,
  WETH_ADDRESS,
  AAVE_POOL_ABI,
  ERC20_ABI,
  AAVE_WETH_GATEWAY,
  BORROWABLE_ASSETS,
  AAVE_TOKENS,
  S_ADDRESS,
  AAVE_DEBT_TOKENS,
} from "./constants";

import {
  SupplyUSDCeSchema,
  SupplyWETHSchema,
  SupplySSchema,
  ApproveUSDCeSchema,
  ApproveWETHSchema,
  WithdrawUSDCeSchema,
  WithdrawWETHSchema,
  WithdrawSSchema,
  BorrowSchema,
  RepaySchema,
} from "./schemas";

import { checkTokenBalance } from "../balance-checker/balanceCheckerActionProvider";

// SonicScan explorer base URL for transaction links
const EXPLORER_BASE_URL = "https://sonicscan.org/tx/";

// Helper function for sleeping/waiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

  supportsNetwork(network: Network): boolean {
    // Support EVM networks
    return network.protocolFamily === "evm";
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

        const approveReceipt = await walletProvider.waitForTransactionReceipt(approveTx);
        const approveTxHash = approveReceipt.transactionHash;
        
        response += `1. Approved ${args.amount} USDC.e for Aave protocol\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${approveTxHash}\n\n`;

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

        const supplyReceipt = await walletProvider.waitForTransactionReceipt(supplyTx);
        const supplyTxHash = supplyReceipt.transactionHash;
        
        response += `2. Supplied ${args.amount} USDC.e to Aave\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${supplyTxHash}\n\n`;

        response += `Successfully supplied ${args.amount} USDC.e to Aave. You are now earning interest on your deposit.`;
        return response;
      } catch (error) {
        console.error('Supply error:', error);
        return `Failed to supply to Aave: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } catch (error) {
      console.error('SupplyUSDCe error:', error);
      return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
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
    name: "aave-supply-s",
    description: "Supply S (native Sonic) to Aave lending protocol (e.g., 'aave-supply-s 10.0')",
    schema: SupplySSchema,
  })
  async supplyS(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof SupplySSchema>
  ): Promise<string> {
    try {
      const amount = parseUnits(args.amount, 18);
      const address = await walletProvider.getAddress();
      let response = `Executing Aave S (native Sonic) supply strategy:\n\n`;

      // For native tokens, we check the balance differently (use the address's balance)
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
      
      // For native token (S), we don't need to approve, we supply directly with value
      try {
        const supplyTx = await walletProvider.sendTransaction({
          to: AAVE_POOL_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: AAVE_POOL_ABI,
            functionName: "supply",
            args: [S_ADDRESS as Hex, amount, address as Hex, 0],
          }),
          value: amount, // Send the S amount as transaction value
          gas: BigInt(300000),
        });

        const supplyReceipt = await walletProvider.waitForTransactionReceipt(supplyTx);
        const supplyTxHash = supplyReceipt.transactionHash;
        
        response += `1. Supplied ${args.amount} S to Aave\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${supplyTxHash}\n\n`;

        response += `Successfully supplied ${args.amount} S to Aave. You are now earning interest on your deposit.`;
        return response;
      } catch (error) {
        console.error('Supply error:', error);
        return `Failed to supply S to Aave: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } catch (error) {
      console.error('SupplyS error:', error);
      return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
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
    name: "aave-withdraw-s",
    description: "Withdraw S (native Sonic) from Aave lending protocol (e.g., 'aave-withdraw-s 10.0')",
    schema: WithdrawSSchema,
  })
  async withdrawS(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof WithdrawSSchema>
  ): Promise<string> {
    try {
      const amount = args.amount === 'max' ? 
        BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff') : 
        parseUnits(args.amount, 18);
      
      const address = await walletProvider.getAddress();
      
      // Execute withdraw transaction
      const withdrawTx = await walletProvider.sendTransaction({
        to: AAVE_POOL_ADDRESS as Hex,
        data: encodeFunctionData({
          abi: AAVE_POOL_ABI,
          functionName: "withdraw",
          args: [S_ADDRESS as Hex, amount, address as Hex],
        }),
        gas: BigInt(300000),
      });

      const withdrawReceipt = await walletProvider.waitForTransactionReceipt(withdrawTx);
      const withdrawTxHash = withdrawReceipt.transactionHash;
      
      return `Successfully withdrew ${args.amount === 'max' ? 'all' : args.amount} S from Aave.\n\n` +
             `Transaction: ${EXPLORER_BASE_URL}${withdrawTxHash}`;
    } catch (error) {
      console.error('Withdraw error:', error);
      return `Failed to withdraw S from Aave: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  @CreateAction({
    name: "borrow-from-aave",
    description: "Borrow assets from Aave",
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

      const receipt = await walletProvider.waitForTransactionReceipt(borrowTx);
      const txHash = receipt.transactionHash;
      const txUrl = `${EXPLORER_BASE_URL}${txHash}`;

      return `Successfully borrowed ${args.amount} ${args.asset.replace('_', '.')}.\n\nTransaction: ${txUrl}\n\nYou can view the transaction details on SonicScan to verify the borrowing.`;

    } catch (error) {
      console.error('Borrow error:', error);
      return `Failed to borrow: ${error instanceof Error ? error.message : 'Unknown error'}`;
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

      const receipt = await walletProvider.waitForTransactionReceipt(repayTx);
      const txHash = receipt.transactionHash;
      const txUrl = `${EXPLORER_BASE_URL}${txHash}`;

      return `Successfully repaid ${args.amount} ${args.asset.replace('_', '.')} to Aave.\n\nTransaction: ${txUrl}\n\nYou can view the transaction details on SonicScan to verify the repayment.`;
    } catch (error) {
      console.error('Repay error:', error);
      return `Failed to repay: ${error instanceof Error ? error.message : 'Unknown error'}`;
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
      asset: z.enum(["USDC_E", "WETH", "WS", "S"])
    }),
  })
  async checkMaxBorrowable(
    walletProvider: EvmWalletProvider,
    args: { asset: "USDC_E" | "WETH" | "WS" | "S" }
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
        // Assuming S/wS price is ~$0.57
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
      
      // Define tokens with correct addresses from constants
      type TokenInfo = {
        aToken: string;
        debtToken: string; // Added debt token address
        address: string;
        decimals: number;
        supplyAPY: number;
        borrowAPY: number;
        priceUSD: number;
      };
      
      type TokenSymbol = "USDC.e" | "WETH" | "S";
      
      const tokens: Record<TokenSymbol, TokenInfo> = {
        "USDC.e": {
          aToken: AAVE_TOKENS.AUSDC_E,
          debtToken: AAVE_DEBT_TOKENS.USDC_E,
          address: BORROWABLE_ASSETS.USDC_E,
          decimals: 6,
          supplyAPY: 0.82,
          borrowAPY: 3.14,
          priceUSD: 1
        },
        "WETH": {
          aToken: AAVE_TOKENS.AWETH,
          debtToken: AAVE_DEBT_TOKENS.WETH,
          address: BORROWABLE_ASSETS.WETH,
          decimals: 18,
          supplyAPY: 0.13,
          borrowAPY: 0.68,
          priceUSD: 2150
        },
        "S": {
          aToken: "", // S supply pool is closed
          debtToken: AAVE_DEBT_TOKENS.S,
          address: BORROWABLE_ASSETS.S,
          decimals: 18,
          supplyAPY: 0.36,
          borrowAPY: 2.60,
          priceUSD: 0.57
        }
      };

      // Calculate supplied assets and debt positions
      let suppliedAssets = [];
      let borrowedAssets = [];
      let weightedSupplyAPY = 0;
      let weightedBorrowAPY = 0;
      
      // Check supplied assets
      for (const [symbol, info] of Object.entries(tokens)) {
        try {
          // Check supplied amount (aToken balance)
          // Skip checking for S token since its supply pool is closed
          let suppliedBalance = BigInt(0);
          if (info.aToken) {  // Only check if aToken address exists
            suppliedBalance = await publicClient.readContract({
              address: info.aToken as Hex,
              abi: ERC20_ABI,
              functionName: "balanceOf",
              args: [address as Hex],
            }).catch(error => {
              console.error(`Error fetching ${symbol} supply position:`, error);
              return BigInt(0); // Return 0 balance on error
            });
          }
          
          const suppliedAmount = Number(formatUnits(suppliedBalance, info.decimals));
          const suppliedUSD = suppliedAmount * info.priceUSD;
          
          if (suppliedAmount > 0) {
            suppliedAssets.push({
              symbol,
              amount: suppliedAmount,
              usdValue: suppliedUSD,
              apy: info.supplyAPY
            });
            
            // Prevent division by zero
            if (Number(totalCollateralUSD) > 0) {
              weightedSupplyAPY += (suppliedUSD / Number(totalCollateralUSD)) * info.supplyAPY;
            }
          }
          
          // Also check debt balance for each asset
          const debtBalance = await publicClient.readContract({
            address: info.debtToken as Hex,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [address as Hex],
          }).catch(() => BigInt(0));
          
          if (debtBalance > 0) {
            const borrowedAmount = Number(formatUnits(debtBalance, info.decimals));
            const borrowedUSD = borrowedAmount * info.priceUSD;
            
            borrowedAssets.push({
              symbol,
              amount: borrowedAmount,
              usdValue: borrowedUSD,
              apy: info.borrowAPY
            });
            
            // Calculate weighted borrow APY
            if (Number(totalDebtUSD) > 0) {
              weightedBorrowAPY += (borrowedUSD / Number(totalDebtUSD)) * info.borrowAPY;
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
      let dashboard = `### 📊 AAVE LENDING DASHBOARD

#### 📈 OVERVIEW
- 💰 **Net Worth:** $${(Number(totalCollateralUSD) - Number(totalDebtUSD)).toFixed(2)}
- 📊 **Net APY:** ${netAPY.toFixed(2)}%
- ❤️ **Health Factor:** ${Number(formatUnits(healthFactor, 18)).toFixed(2)}

#### 💎 SUPPLIED ASSETS
- 💰 **Total Balance:** $${totalCollateralUSD} (APY: ${weightedSupplyAPY.toFixed(2)}%)`;

      // Display each supplied asset
      if (suppliedAssets.length > 0) {
        for (const asset of suppliedAssets) {
          const formattedAmount = asset.symbol === "USDC.e" ? asset.amount.toFixed(2) : asset.amount.toFixed(6);
          dashboard += `\n  - ${asset.symbol === "USDC.e" ? "💵" : asset.symbol === "WETH" ? "⚡" : "🔷"} **${asset.symbol}:** ${formattedAmount} ($${asset.usdValue.toFixed(2)}) - APY: ${asset.apy}%`;
        }
      } else {
        dashboard += `\n  - No supplied assets found`;
      }

      dashboard += `\n\n#### 🏦 BORROWED ASSETS
- 💸 **Total Balance:** $${totalDebtUSD} (APY: -${weightedBorrowAPY.toFixed(2)}%)`;
      
      // Display each borrowed asset
      if (borrowedAssets.length > 0) {
        for (const asset of borrowedAssets) {
          const formattedAmount = asset.symbol === "USDC.e" ? asset.amount.toFixed(2) : asset.amount.toFixed(6);
          dashboard += `\n  - ${asset.symbol === "USDC.e" ? "💵" : asset.symbol === "WETH" ? "⚡" : "🔷"} **${asset.symbol}:** ${formattedAmount} ($${asset.usdValue.toFixed(2)}) - APY: -${asset.apy}%`;
        }
      } else {
        dashboard += `\n  - No borrowed assets found`;
      }
      
      // Add borrowing power section
      dashboard += `\n\n#### 💪 BORROWING POWER
- 📊 **Available:** $${availableBorrowUSD}
  - 💵 **USDC.e:** ${availableBorrowUSD} ($${availableBorrowUSD})
  - ⚡ **WETH:** ${(Number(availableBorrowUSD) / 2150).toFixed(6)} ($${availableBorrowUSD})
  - 🔷 **S:** ${(Number(availableBorrowUSD) / 0.57).toFixed(2)} ($${availableBorrowUSD})`;
      
      return dashboard;

    } catch (error) {
      console.error('Error generating Aave dashboard:', error);
      return `Failed to generate Aave dashboard: ${error instanceof Error ? error.message : 'Unknown error'}. Try checking your balances for a summary of your positions.`;
    }
  }

  private async repayDebt(
    walletProvider: EvmWalletProvider,
    amount: string | number, 
    assetType: string | null = null
  ) {
    const address = await walletProvider.getAddress();
    const publicClient = createPublicClient({
      chain: sonic,
      transport: http()
    });
    
    // Determine which asset to repay
    let assetToRepay: string;
    if (assetType) {
      // If assetType is specified, use it
      assetToRepay = this.getAssetAddressBySymbol(assetType);
      if (!assetToRepay) {
        throw new Error(`Unknown asset type: ${assetType}. Please use a valid asset type.`);
      }
    } else {
      // If no assetType is specified, default to USDC.e
      assetToRepay = BORROWABLE_ASSETS.USDC_E;
    }

    // Convert amount to BigInt
    const amountInWei = parseUnits(
      amount.toString(),
      assetToRepay === BORROWABLE_ASSETS.S ? 18 : 6
    );

    // Approve AAVE pool to spend tokens if not native S
    if (assetToRepay !== BORROWABLE_ASSETS.S) {
      // Check current balance first
      const balance = await publicClient.readContract({
        address: assetToRepay as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address as `0x${string}`]
      });

      if (balance < amountInWei) {
        throw new InsufficientBalanceError(
          assetType || "USDC.e",
          formatUnits(amountInWei, assetToRepay === BORROWABLE_ASSETS.S ? 18 : 6),
          formatUnits(balance, assetToRepay === BORROWABLE_ASSETS.S ? 18 : 6)
        );
      }

      // Approve the AAVE pool to spend tokens
      const approveTx = await walletProvider.sendTransaction({
        to: assetToRepay as `0x${string}`,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [AAVE_POOL_ADDRESS as `0x${string}`, amountInWei]
        })
      });

      await walletProvider.waitForTransactionReceipt(approveTx);
    }

    // Repay debt
    const repayTx = await walletProvider.sendTransaction({
      to: AAVE_POOL_ADDRESS as `0x${string}`,
      data: encodeFunctionData({
        abi: AAVE_POOL_ABI,
        functionName: "repay",
        args: [
          assetToRepay as `0x${string}`,
          amountInWei,
          2n, // Variable interest rate
          address as `0x${string}`
        ]
      }),
      value: assetToRepay === BORROWABLE_ASSETS.S ? amountInWei : 0n
    });

    // Wait for transaction to complete
    const receipt = await walletProvider.waitForTransactionReceipt(repayTx);
    
    return receipt.transactionHash;
  }

  private getAssetAddressBySymbol(symbol: string): string {
    switch(symbol.toUpperCase()) {
      case 'USDC.E':
      case 'USDC_E':
        return BORROWABLE_ASSETS.USDC_E;
      case 'WETH':
        return BORROWABLE_ASSETS.WETH;
      case 'WS':
        return BORROWABLE_ASSETS.WS;
      case 'S':
        return BORROWABLE_ASSETS.S;
      default:
        return '';
    }
  }
}