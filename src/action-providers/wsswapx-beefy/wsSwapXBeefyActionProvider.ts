import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import { encodeFunctionData, createPublicClient, http, parseEther, formatEther } from "viem";
import type { Hex } from "viem";
import "reflect-metadata";
import { sonic } from 'viem/chains';

import {
  SWAPX_VAULT_ADDRESS,
  BEEFY_VAULT_ADDRESS,
  WS_TOKEN_ADDRESS,
  SWAPX_VAULT_ABI,
  BEEFY_VAULT_ABI,
  ERC20_ABI,
} from "./constants";

import {
  DepositWsSwapXSchema,
  ApproveSwapXSchema,
  ApproveBeefySchema,
  DepositBeefySchema,
} from "./schemas";

import {
  WSSwapXBeefyError,
  InsufficientBalanceError,
  InsufficientAllowanceError,
} from "./errors";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const EXPLORER_BASE_URL = "https://sonicscan.org/tx/";

export class WSSwapXBeefyActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("wsswapx-beefy", []);
  }

  @CreateAction({
    name: "execute-full-ws-swapx-beefy-strategy",
    description: "Execute the full wS SwapX Beefy strategy",
    schema: DepositWsSwapXSchema,
  })
  async executeFullStrategy(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof DepositWsSwapXSchema>
  ): Promise<string> {
    try {
      // Convert human readable amount to wei
      const amount = parseEther(args.amount);
      const address = await walletProvider.getAddress();

      // Get current balance
      const publicClient = createPublicClient({
        chain: sonic,
        transport: http()
      });

      const currentBalance = await publicClient.readContract({
        address: WS_TOKEN_ADDRESS as Hex,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address as Hex]
      });

      if (currentBalance < amount) {
        const formattedBalance = formatEther(currentBalance);
        const formattedAmount = formatEther(amount);
        return `❌ Insufficient wS balance. You have ${formattedBalance} wS but need ${formattedAmount} wS`;
      }

      let response = "## 🔥 Executing full wS SwapX Beefy strategy:\n\n";
      response += `✅ Sufficient wS balance: ${formatEther(currentBalance)} wS\n\n`;
      
      // Step 1: Approve wS for SwapX
      try {
        response += `📝 Transaction 1/3: Approve SwapX LP vault to spend wS\n`;
        const approveSwapXTx = await walletProvider.sendTransaction({
          to: WS_TOKEN_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [
              SWAPX_VAULT_ADDRESS as Hex,
              amount
            ]
          })
        });
        response += `🔄 Transaction submitted: ${approveSwapXTx} [View on SonicScan](${EXPLORER_BASE_URL}${approveSwapXTx})\n`;
        await walletProvider.waitForTransactionReceipt(approveSwapXTx);
        response += `✅ Approval successful!\n\n`;

        // Step 2: Deposit wS into SwapX vault
        response += `📝 Transaction 2/3: Deposit ${args.amount} wS into SwapX vault\n`;
        await sleep(2000); // Give the blockchain time to process the approval
        
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
        
        // Check LP Token balance
        await sleep(2000);
        const lpBalance = await publicClient.readContract({
          address: SWAPX_VAULT_ADDRESS as Hex,
          abi: SWAPX_VAULT_ABI,
          functionName: 'balanceOf',
          args: [address as Hex]
        });
        const formattedLpBalance = formatEther(lpBalance);
        response += `✅ Deposit successful! Received ${formattedLpBalance} LP tokens\n\n`;

        // Step 3: Approve LP tokens for Beefy
        response += `📝 Transaction 3/3: Stake LP tokens in Beefy vault\n`;
        const approveLPBeefyTx = await walletProvider.sendTransaction({
          to: SWAPX_VAULT_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: SWAPX_VAULT_ABI,
            functionName: 'approve',
            args: [
              BEEFY_VAULT_ADDRESS as Hex,
              lpBalance
            ]
          })
        });
        
        response += `🔄 Approving LP tokens for Beefy: ${approveLPBeefyTx} [View on SonicScan](${EXPLORER_BASE_URL}${approveLPBeefyTx})\n`;
        await walletProvider.waitForTransactionReceipt(approveLPBeefyTx);
        
        // Step 4: Deposit LP tokens into Beefy vault
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
        const formattedBeefyBalance = formatEther(beefyBalance);
        response += `✅ Staking successful! Received ${formattedBeefyBalance} mooTokens\n\n`;
        
        // Successfully completed all steps
        response += `🎉 Strategy execution complete! You've successfully:\n`;
        response += `1. Deposited ${args.amount} wS into SwapX vault\n`;
        response += `2. Received ${formattedLpBalance} LP tokens\n`;
        response += `3. Staked LP tokens in Beefy vault earning ~500% APY\n`;
        
        return response;
      } catch (error) {
        console.error('Error executing strategy:', error);
        throw new WSSwapXBeefyError('Transaction failed. Please try again later.');
      }
    } catch (error) {
      console.error('Error executing wS-SwapX-Beefy strategy:', error);
      if (error instanceof WSSwapXBeefyError) {
        return `❌ ${error.message}`;
      }
      return `❌ Failed to execute strategy: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  @CreateAction({
    name: "wsswapx-beefy-withdraw",
    description: "Withdraw your position from wS SwapX Beefy strategy",
    schema: z.object({}).strip(),
  })
  async withdrawPosition(
    walletProvider: EvmWalletProvider,
  ): Promise<string> {
    try {
      const address = await walletProvider.getAddress();
      let response = `Withdrawing from wS SwapX Beefy strategy:\n\n`;

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
        return "No balance found in Beefy vault. Nothing to withdraw.";
      }

      // Step 2: Withdraw all from Beefy vault
      try {
        const withdrawAllTx = await walletProvider.sendTransaction({
          to: BEEFY_VAULT_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: BEEFY_VAULT_ABI,
            functionName: "withdrawAll"
          }),
          gas: BigInt(400000),
        });

        response += `1. Withdrawn from Beefy vault\n` +
                    `   Transaction: ${EXPLORER_BASE_URL}${withdrawAllTx}\n\n`;

        await walletProvider.waitForTransactionReceipt(withdrawAllTx);
        await sleep(5000); // Wait for state updates
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
          gas: BigInt(7000000),
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

export const wsSwapXBeefyActionProvider = () => new WSSwapXBeefyActionProvider();