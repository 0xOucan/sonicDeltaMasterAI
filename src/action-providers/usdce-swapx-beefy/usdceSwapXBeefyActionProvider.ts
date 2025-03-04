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
  SWAPX_VAULT_ADDRESS,
  BEEFY_VAULT_ADDRESS,
  USDC_E_ADDRESS,
  SWAPX_VAULT_ABI,
  BEEFY_VAULT_ABI,
  ERC20_ABI,
} from "./constants";

import {
  DepositUSDCeSwapXSchema,
  ApproveSwapXSchema,
  ApproveBeefySchema,
  DepositBeefySchema,
} from "./schemas";

import {
  USDCeSwapXBeefyError,
  InsufficientBalanceError,
  InsufficientAllowanceError,
} from "./errors";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const EXPLORER_BASE_URL = "https://sonicscan.org/tx/";

const formatAmount = (amount: string): string => {
  if (!amount.includes('.')) {
    return amount + '.0';
  }
  return amount;
};

export class USDCeSwapXBeefyActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("usdce-swapx-beefy", []);
  }

  @CreateAction({
    name: "execute-usdce-strategy",
    description: "Execute the full USDC.e SwapX Beefy strategy",
    schema: DepositUSDCeSwapXSchema,
  })
  async executeFullStrategy(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof DepositUSDCeSwapXSchema>
  ): Promise<string> {
    try {
      const formattedAmount = formatAmount(args.amount);
      const amount = parseUnits(formattedAmount, 6); // USDC.e has 6 decimals
      const address = await walletProvider.getAddress();
      let response = "## 💰 Executing full USDC.e SwapX Beefy strategy:\n\n";

      const publicClient = createPublicClient({
        chain: sonic,
        transport: http()
      });

      // Check USDC.e balance
      const currentBalance = await publicClient.readContract({
        address: USDC_E_ADDRESS as Hex,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address as Hex]
      });

      if (currentBalance < amount) {
        const humanReadableBalance = formatUnits(currentBalance, 6);
        return `❌ Insufficient USDC.e balance. You have ${humanReadableBalance} USDC.e but need ${args.amount} USDC.e`;
      }

      response += `✅ Sufficient USDC.e balance: ${formatUnits(currentBalance, 6)} USDC.e\n\n`;
      
      // Step 1: Approve USDC.e for SwapX
      try {
        response += `📝 Transaction 1/3: Approve SwapX LP vault to spend USDC.e\n`;
        
        const approveSwapXTx = await walletProvider.sendTransaction({
          to: USDC_E_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [SWAPX_VAULT_ADDRESS as Hex, amount]
          })
        });
        
        response += `🔄 Transaction submitted: ${approveSwapXTx} [View on SonicScan](${EXPLORER_BASE_URL}${approveSwapXTx})\n`;
        await walletProvider.waitForTransactionReceipt(approveSwapXTx);
        response += `✅ Approval successful!\n\n`;

        // Step 2: Deposit USDC.e into SwapX
        response += `📝 Transaction 2/3: Deposit ${args.amount} USDC.e into SwapX vault\n`;
        
        await sleep(2000); // Give blockchain time to process the approval
        
        const depositSwapXTx = await walletProvider.sendTransaction({
          to: SWAPX_VAULT_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: SWAPX_VAULT_ABI,
            functionName: 'deposit',
            args: [amount, BigInt(0), address as Hex]
          })
        });
        
        response += `🔄 Transaction submitted: ${depositSwapXTx} [View on SonicScan](${EXPLORER_BASE_URL}${depositSwapXTx})\n`;
        await walletProvider.waitForTransactionReceipt(depositSwapXTx);
        
        // Check LP balance
        await sleep(2000);
        const lpBalance = await publicClient.readContract({
          address: SWAPX_VAULT_ADDRESS as Hex,
          abi: SWAPX_VAULT_ABI,
          functionName: 'balanceOf',
          args: [address as Hex]
        });
        
        if (lpBalance === BigInt(0)) {
          return `❌ Strategy execution failed: No SwapX LP tokens received after deposit. Please try again later.`;
        }
        
        const formattedLpBalance = formatUnits(lpBalance, 18);
        response += `✅ Deposit successful! Received ${formattedLpBalance} LP tokens\n\n`;

        // Step 3: Approve LP tokens for Beefy
        response += `📝 Transaction 3/3: Stake LP tokens in Beefy vault\n`;
        
        const approveBeefyTx = await walletProvider.sendTransaction({
          to: SWAPX_VAULT_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: SWAPX_VAULT_ABI,
            functionName: 'approve',
            args: [BEEFY_VAULT_ADDRESS as Hex, lpBalance]
          })
        });
        
        response += `🔄 Approving LP tokens for Beefy: ${approveBeefyTx} [View on SonicScan](${EXPLORER_BASE_URL}${approveBeefyTx})\n`;
        await walletProvider.waitForTransactionReceipt(approveBeefyTx);
        
        // Step 4: Deposit LP tokens into Beefy
        await sleep(2000);
        
        const depositBeefyTx = await walletProvider.sendTransaction({
          to: BEEFY_VAULT_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: BEEFY_VAULT_ABI,
            functionName: 'depositAll',
            args: []
          })
        });
        
        response += `🔄 Staking LP tokens in Beefy: ${depositBeefyTx} [View on SonicScan](${EXPLORER_BASE_URL}${depositBeefyTx})\n`;
        await walletProvider.waitForTransactionReceipt(depositBeefyTx);
        
        // Check Beefy vault token balance
        await sleep(2000);
        const beefyBalance = await publicClient.readContract({
          address: BEEFY_VAULT_ADDRESS as Hex,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address as Hex]
        });
        
        const formattedBeefyBalance = formatUnits(beefyBalance, 18);
        response += `✅ Staking successful! Received ${formattedBeefyBalance} mooTokens\n\n`;
        
        // Successfully completed all steps
        response += `🎉 Strategy execution complete! You've successfully:\n`;
        response += `1. Deposited ${args.amount} USDC.e into SwapX vault\n`;
        response += `2. Received ${formattedLpBalance} LP tokens\n`;
        response += `3. Staked LP tokens in Beefy vault earning ~250% APY\n`;
        
        return response;
      } catch (error) {
        console.error('Error executing strategy:', error);
        throw new USDCeSwapXBeefyError(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error executing USDC.e-SwapX-Beefy strategy:', error);
      if (error instanceof USDCeSwapXBeefyError) {
        return `❌ ${error.message}`;
      } else if (error instanceof InsufficientBalanceError || error instanceof InsufficientAllowanceError) {
        return `❌ ${error.message}`;
      }
      return `❌ Failed to execute strategy: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  @CreateAction({
    name: "usdce-swapx-beefy-withdraw",
    description: "Withdraw from USDC.e SwapX Beefy strategy",
    schema: z.object({}).strip(),
  })
  async withdrawStrategy(
    walletProvider: EvmWalletProvider,
  ): Promise<string> {
    try {
      const address = await walletProvider.getAddress();
      let response = `Withdrawing from USDC.e SwapX Beefy strategy:\n\n`;

      // Step 1: Check Beefy vault balance
      const publicClient = createPublicClient({
        chain: sonic,
        transport: http()
      });

      const beefyBalance = await publicClient.readContract({
        address: BEEFY_VAULT_ADDRESS as Hex,
        abi: BEEFY_VAULT_ABI,
        functionName: 'balanceOf',
        args: [address as Hex]
      });

      if (beefyBalance === BigInt(0)) {
        return "No balance found in Beefy vault to withdraw.";
      }

      // Step 2: Withdraw all from Beefy vault
      try {
        const withdrawAllTx = await walletProvider.sendTransaction({
          to: BEEFY_VAULT_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: BEEFY_VAULT_ABI,
            functionName: "withdrawAll",
          }),
          gas: BigInt(400000),
        });

        response += `1. Withdrawn from Beefy vault\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${withdrawAllTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(withdrawAllTx);
        await sleep(5000);
      } catch (error) {
        console.error('Beefy withdrawal error:', error);
        return `Failed to withdraw from Beefy vault: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      // Step 3: Check SwapX LP balance
      const swapXBalance = await publicClient.readContract({
        address: SWAPX_VAULT_ADDRESS as Hex,
        abi: SWAPX_VAULT_ABI,
        functionName: 'balanceOf',
        args: [address as Hex]
      });

      if (swapXBalance === BigInt(0)) {
        return response + "\nNo SwapX LP tokens found after Beefy withdrawal. Please check your balance and try again.";
      }

      // Step 4: Withdraw from SwapX
      try {
        const withdrawTx = await walletProvider.sendTransaction({
          to: SWAPX_VAULT_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: SWAPX_VAULT_ABI,
            functionName: "withdraw",
            args: [swapXBalance, address as Hex]
          }),
          gas: BigInt(1000000),
        });

        response += `2. Withdrawn from SwapX vault\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${withdrawTx}`;

        await walletProvider.waitForTransactionReceipt(withdrawTx);
        return response;
      } catch (error) {
        console.error('SwapX withdrawal error:', error);
        return `Failed to withdraw from SwapX vault: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    } catch (error) {
      console.error('Strategy withdrawal error:', error);
      return `Failed to execute withdrawal: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  supportsNetwork = (network: Network) => network.protocolFamily === "evm";
}

export const usdceSwapXBeefyActionProvider = () => new USDCeSwapXBeefyActionProvider(); 