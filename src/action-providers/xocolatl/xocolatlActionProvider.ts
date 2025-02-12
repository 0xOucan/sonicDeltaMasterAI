import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import { encodeFunctionData } from "viem";
import type { Hex } from "viem";
import "reflect-metadata";
import {
  TransferXocSchema,
  ApproveXocSchema,
  GetXocBalanceSchema,
  HouseOfReserveSchema,
  HouseOfCoinSchema,
  LiquidateSchema,
} from "./schemas";
import {
  XOCOLATL_ADDRESS,
  XOCOLATL_ABI,
  HOUSE_OF_RESERVE_ADDRESS,
  HOUSE_OF_RESERVE_ABI,
  HOUSE_OF_COIN_ADDRESS,
  HOUSE_OF_COIN_ABI,
  ACCOUNT_LIQUIDATOR_ADDRESS,
  LIQUIDATOR_ABI,
} from "./constants";

/**
 * XocolatlActionProvider provides actions for interacting with LA DAO's Xocolatl ($XOC) token
 */
export class XocolatlActionProvider extends ActionProvider<EvmWalletProvider> {
  constructor() {
    super("xocolatl", []);
  }

  @CreateAction({
    name: "transfer-xoc",
    description: `
This tool will transfer XOC tokens to another address onchain.
It takes:
- to: The destination address that will receive the XOC tokens
- amount: The amount of XOC tokens to transfer (in wei)

The tool will return a success message with the transaction details or an error message if the transfer fails.
`,
    schema: TransferXocSchema,
  })
  async transferXoc(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof TransferXocSchema>,
  ): Promise<string> {
    try {
      const data = encodeFunctionData({
        abi: XOCOLATL_ABI,
        functionName: "transfer",
        args: [args.to as Hex, BigInt(args.amount)],
      });

      const tx = await walletProvider.sendTransaction({
        to: XOCOLATL_ADDRESS as Hex,
        data,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully transferred ${args.amount} XOC to ${args.to}`;
    } catch (error) {
      return `Error transferring XOC: ${error}`;
    }
  }

  @CreateAction({
    name: "approve-xoc",
    description: `
This tool will approve another address to spend XOC tokens on behalf of the user.
It takes:
- spender: The address to approve for spending XOC tokens
- amount: The amount of XOC tokens to approve (in wei)

Important: This is required before any contract can transfer XOC tokens on your behalf.
`,
    schema: ApproveXocSchema,
  })
  async approveXoc(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ApproveXocSchema>,
  ): Promise<string> {
    try {
      const data = encodeFunctionData({
        abi: XOCOLATL_ABI,
        functionName: "approve",
        args: [args.spender as Hex, BigInt(args.amount)],
      });

      const tx = await walletProvider.sendTransaction({
        to: XOCOLATL_ADDRESS as Hex,
        data,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully approved ${args.spender} to spend ${args.amount} XOC`;
    } catch (error) {
      return `Error approving XOC: ${error}`;
    }
  }

  @CreateAction({
    name: "get-balance",
    description: `
This tool will check the XOC token balance of any address.
It takes:
- address: The address to check the balance for

Returns the balance in wei format.
`,
    schema: GetXocBalanceSchema,
  })
  async getBalance(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetXocBalanceSchema>,
  ): Promise<string> {
    try {
      const balance = await walletProvider.readContract({
        address: XOCOLATL_ADDRESS as Hex,
        abi: XOCOLATL_ABI,
        functionName: "balanceOf",
        args: [args.address as Hex],
      }) as bigint;

      return `Balance: ${balance.toString()} XOC`;
    } catch (error) {
      return `Error getting balance: ${error}`;
    }
  }

  @CreateAction({
    name: "borrow-xoc",
    description: `
This tool allows borrowing XOC tokens by using collateral in the House of Reserve.
It takes:
- amount: The amount of XOC to borrow (in wei)

Important: 
- You must have sufficient collateral deposited first
- The borrowed amount must maintain the required collateralization ratio
- If unsure about the amount, use other actions to check your borrowing power first
`,
    schema: HouseOfCoinSchema,
  })
  async borrowXoc(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof HouseOfCoinSchema>,
  ): Promise<string> {
    try {
      const data = encodeFunctionData({
        abi: HOUSE_OF_COIN_ABI,
        functionName: "mintCoin",
        args: [
          XOCOLATL_ADDRESS as Hex,
          HOUSE_OF_RESERVE_ADDRESS as Hex,
          BigInt(args.amount),
        ],
      });

      const tx = await walletProvider.sendTransaction({
        to: HOUSE_OF_COIN_ADDRESS as Hex,
        data,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully borrowed ${args.amount} XOC`;
    } catch (error) {
      return `Error borrowing XOC: ${error}`;
    }
  }

  @CreateAction({
    name: "repay-xoc",
    description: `
This tool allows repaying borrowed XOC tokens to the House of Coin.
It takes:
- amount: The amount of XOC to repay (in wei)

Important:
- Make sure you have approved the House of Coin to spend your XOC tokens first
- The full amount must be repaid to withdraw your collateral
`,
    schema: HouseOfCoinSchema,
  })
  async repayXoc(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof HouseOfCoinSchema>,
  ): Promise<string> {
    try {
      const data = encodeFunctionData({
        abi: HOUSE_OF_COIN_ABI,
        functionName: "paybackCoin",
        args: [BigInt(0), BigInt(args.amount)],
      });

      const tx = await walletProvider.sendTransaction({
        to: HOUSE_OF_COIN_ADDRESS as Hex,
        data,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully repaid ${args.amount} XOC`;
    } catch (error) {
      return `Error repaying XOC: ${error}`;
    }
  }

  @CreateAction({
    name: "liquidate-account",
    description: `
This tool will liquidate an undercollateralized account in the Xocolatl system.
It takes:
- account: The address of the account to liquidate

Important:
- The account must be below the minimum collateralization ratio
- You must have sufficient XOC tokens to perform the liquidation
- Check the account's health factor before attempting liquidation
`,
    schema: LiquidateSchema,
  })
  async liquidateAccount(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof LiquidateSchema>,
  ): Promise<string> {
    try {
      const data = encodeFunctionData({
        abi: LIQUIDATOR_ABI,
        functionName: "liquidateUser",
        args: [args.account as Hex, HOUSE_OF_RESERVE_ADDRESS as Hex],
      });

      const tx = await walletProvider.sendTransaction({
        to: ACCOUNT_LIQUIDATOR_ADDRESS as Hex,
        data,
      });

      await walletProvider.waitForTransactionReceipt(tx);
      return `Successfully liquidated account ${args.account}`;
    } catch (error) {
      return `Error liquidating account: ${error}`;
    }
  }

  supportsNetwork = (network: Network) => network.protocolFamily === "evm";
}

export const xocolatlActionProvider = () => new XocolatlActionProvider();
