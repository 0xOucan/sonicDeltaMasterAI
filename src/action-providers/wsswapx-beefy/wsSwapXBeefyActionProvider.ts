import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import { encodeFunctionData, createPublicClient, http } from "viem";
import type { Hex } from "viem";
import "reflect-metadata";
import { sonic } from 'viem/chains';

import {
  SWAPX_VAULT_ADDRESS,
  BEEFY_VAULT_ADDRESS,
  WS_TOKEN_ADDRESS,
  SWAPX_VAULT_ABI,
  BEEFY_VAULT_ABI,
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
    name: "step1-approve-ws-swapx",
    description: `
Step 1: Approve wS tokens to be spent by SwapX vault.
Parameters:
- amount: Amount of wS to approve (in wei)
`,
    schema: ApproveSwapXSchema,
  })
  async approveWsSwapX(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ApproveSwapXSchema>,
  ): Promise<string> {
    try {
      const data = encodeFunctionData({
        abi: SWAPX_VAULT_ABI,
        functionName: "approve",
        args: [SWAPX_VAULT_ADDRESS as Hex, BigInt(args.amount)],
      });

      const tx = await walletProvider.sendTransaction({
        to: WS_TOKEN_ADDRESS as Hex,
        data,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Step 1 Complete: Successfully approved ${args.amount} wS for SwapX vault. Please wait a few seconds before proceeding to step 2.`;
    } catch (error) {
      if (error instanceof Error) {
        return `Transaction failed: ${error.message}`;
      }
      return `Unknown error occurred: ${error}`;
    }
  }

  @CreateAction({
    name: "step2-deposit-ws-swapx",
    description: `
Step 2: Deposit wS tokens into SwapX vault (execute after step 1).
Parameters:
- amount: Amount of wS to deposit (in wei)
`,
    schema: DepositWsSwapXSchema,
  })
  async depositWsSwapX(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof DepositWsSwapXSchema>,
  ): Promise<string> {
    try {
      const address = await walletProvider.getAddress();
      
      const data = encodeFunctionData({
        abi: SWAPX_VAULT_ABI,
        functionName: "deposit",
        args: [BigInt(args.amount), BigInt(0), address as Hex],
      });

      const tx = await walletProvider.sendTransaction({
        to: SWAPX_VAULT_ADDRESS as Hex,
        data,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Step 2 Complete: Successfully deposited ${args.amount} wS into SwapX vault. Please wait a few seconds before proceeding to step 3.`;
    } catch (error) {
      if (error instanceof Error) {
        return `Transaction failed: ${error.message}`;
      }
      return `Unknown error occurred: ${error}`;
    }
  }

  @CreateAction({
    name: "step3-approve-swapx-beefy",
    description: `
Step 3: Approve SwapX LP tokens to be spent by Beefy vault (execute after step 2).
Parameters:
- amount: Amount of SwapX LP tokens to approve
`,
    schema: ApproveBeefySchema,
  })
  async approveSwapXBeefy(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ApproveBeefySchema>,
  ): Promise<string> {
    try {
      const data = encodeFunctionData({
        abi: BEEFY_VAULT_ABI,
        functionName: "approve",
        args: [BEEFY_VAULT_ADDRESS as Hex, BigInt(args.amount)],
      });

      const tx = await walletProvider.sendTransaction({
        to: SWAPX_VAULT_ADDRESS as Hex,
        data,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Step 3 Complete: Successfully approved ${args.amount} SwapX LP tokens for Beefy vault. Please wait a few seconds before proceeding to step 4.`;
    } catch (error) {
      if (error instanceof Error) {
        return `Transaction failed: ${error.message}`;
      }
      return `Unknown error occurred: ${error}`;
    }
  }

  @CreateAction({
    name: "step4-deposit-swapx-beefy",
    description: `
Step 4: Deposit SwapX LP tokens into Beefy vault (final step).
Parameters:
- amount: Amount of SwapX LP tokens to deposit
`,
    schema: DepositBeefySchema,
  })
  async depositSwapXBeefy(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof DepositBeefySchema>,
  ): Promise<string> {
    try {
      const data = encodeFunctionData({
        abi: BEEFY_VAULT_ABI,
        functionName: "deposit",
        args: [BigInt(args.amount)],
      });

      const tx = await walletProvider.sendTransaction({
        to: BEEFY_VAULT_ADDRESS as Hex,
        data,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Step 4 Complete: Successfully deposited ${args.amount} SwapX LP tokens into Beefy vault. Strategy execution complete!`;
    } catch (error) {
      if (error instanceof Error) {
        return `Transaction failed: ${error.message}`;
      }
      return `Unknown error occurred: ${error}`;
    }
  }

  @CreateAction({
    name: "execute-full-strategy",
    description: `
Execute the complete wS-SwapX-Beefy strategy in one go.
This will:
1. Approve wS for SwapX vault
2. Deposit wS into SwapX vault
3. Approve SwapX LP tokens for Beefy vault
4. Deposit into Beefy vault using depositAll()

Parameters:
- amount: Amount of wS to use for the strategy (in wei)
`,
    schema: DepositWsSwapXSchema,
  })
  async executeFullStrategy(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof DepositWsSwapXSchema>,
  ): Promise<string> {
    try {
      // Step 1: Approve wS for SwapX
      const approveWsData = encodeFunctionData({
        abi: SWAPX_VAULT_ABI,
        functionName: "approve",
        args: [SWAPX_VAULT_ADDRESS as Hex, BigInt(args.amount)],
      });

      const approveTx = await walletProvider.sendTransaction({
        to: WS_TOKEN_ADDRESS as Hex,
        data: approveWsData,
      });
      await walletProvider.waitForTransactionReceipt(approveTx);
      console.log("Step 1 complete: wS approved for SwapX");
      console.log(`Transaction: ${EXPLORER_BASE_URL}${approveTx}`);
      await sleep(3000);

      // Step 2: Deposit wS into SwapX
      const address = await walletProvider.getAddress();
      const depositData = encodeFunctionData({
        abi: SWAPX_VAULT_ABI,
        functionName: "deposit",
        args: [BigInt(args.amount), BigInt(0), address as Hex],
      });

      const depositTx = await walletProvider.sendTransaction({
        to: SWAPX_VAULT_ADDRESS as Hex,
        data: depositData,
      });
      await walletProvider.waitForTransactionReceipt(depositTx);
      console.log("Step 2 complete: wS deposited into SwapX");
      console.log(`Transaction: ${EXPLORER_BASE_URL}${depositTx}`);
      await sleep(3000);

      // Get SwapX LP token balance using public client
      const publicClient = createPublicClient({
        chain: sonic,
        transport: http(),
      });

      const lpBalance = await publicClient.readContract({
        address: SWAPX_VAULT_ADDRESS as Hex,
        abi: SWAPX_VAULT_ABI,
        functionName: 'balanceOf',
        args: [address as Hex],
      });

      console.log(`Received SwapX LP tokens: ${lpBalance.toString()}`);

      // Step 3: Approve SwapX LP tokens for Beefy
      const approveBeefyData = encodeFunctionData({
        abi: SWAPX_VAULT_ABI,
        functionName: "approve",
        args: [BEEFY_VAULT_ADDRESS as Hex, lpBalance],
      });

      const approveBeefyTx = await walletProvider.sendTransaction({
        to: SWAPX_VAULT_ADDRESS as Hex,
        data: approveBeefyData,
      });
      await walletProvider.waitForTransactionReceipt(approveBeefyTx);
      console.log("Step 3 complete: SwapX LP tokens approved for Beefy");
      console.log(`Transaction: ${EXPLORER_BASE_URL}${approveBeefyTx}`);
      await sleep(3000);

      // Step 4: Deposit into Beefy using depositAll
      const depositBeefyData = encodeFunctionData({
        abi: BEEFY_VAULT_ABI,
        functionName: "depositAll",
        args: [],
      });

      const depositBeefyTx = await walletProvider.sendTransaction({
        to: BEEFY_VAULT_ADDRESS as Hex,
        data: depositBeefyData,
      });
      await walletProvider.waitForTransactionReceipt(depositBeefyTx);
      console.log("Step 4 complete: Deposited into Beefy vault");
      console.log(`Transaction: ${EXPLORER_BASE_URL}${depositBeefyTx}`);

      return `Strategy execution completed successfully:
1. Approved wS for SwapX ✓ (${EXPLORER_BASE_URL}${approveTx})
2. Deposited wS into SwapX ✓ (${EXPLORER_BASE_URL}${depositTx})
3. Approved SwapX LP (${lpBalance.toString()} tokens) for Beefy ✓ (${EXPLORER_BASE_URL}${approveBeefyTx})
4. Deposited all LP tokens into Beefy vault ✓ (${EXPLORER_BASE_URL}${depositBeefyTx})`;

    } catch (error) {
      if (error instanceof Error) {
        return `Strategy execution failed: ${error.message}`;
      }
      return `Strategy execution failed with unknown error: ${error}`;
    }
  }

  @CreateAction({
    name: "list-strategies",
    description: "Display available DeFi strategies and usage examples",
    schema: z.object({}),
  })
  async listStrategies(): Promise<string> {
    return `Available DeFi Strategies:

1. wS-SwapX-Beefy Strategy
   - Description: Deposit wS into SwapX vault to receive LP tokens, then stake them in Beefy for additional rewards
   - Usage: "execute full wS swapx beefy strategy with 1.0 wS"
   - Requirements: 
     * Sufficient wS tokens
     * Gas for 4 transactions

More strategies coming soon!

To execute a strategy, use the exact command format shown in the usage example.
You can check your token balances first to ensure you have sufficient funds.`;
  }

  @CreateAction({
    name: "execute-full-strategy",
    description: "Execute a complete DeFi strategy",
    schema: z.object({}),
  })
  async executeFullStrategy(): Promise<string> {
    return `Please specify which strategy you want to execute. Available strategies:

1. wS-SwapX-Beefy Strategy
   Example: "execute full wS swapx beefy strategy with 1.0 wS"

Use the exact command format shown in the example.
You can view all available strategies by typing "list strategies" or "show menu".`;
  }

  supportsNetwork = (network: Network) => network.protocolFamily === "evm";
}

export const wsSwapXBeefyActionProvider = () => new WSSwapXBeefyActionProvider();