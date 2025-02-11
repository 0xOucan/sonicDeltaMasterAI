import { z } from "zod";
import {
  ActionProvider,
  Network,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import { encodeFunctionData } from "viem";
import type { Hex } from "viem";
import {
  TransferXocSchema,
  ApproveXocSchema,
  GetXocBalanceSchema,
  MintXocSchema,
  BurnXocSchema,
  FlashLoanSchema,
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
export class XocolatlActionProvider extends ActionProvider {
  constructor() {
    super("xocolatl", []);
  }

  @CreateAction({
    name: "transfer-xoc",
    description: "Transfer XOC tokens to another address",
    schema: TransferXocSchema,
  })
  async transferXoc(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof TransferXocSchema>,
  ): Promise<string> {
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
  }

  @CreateAction({
    name: "approve-xoc",
    description: "Approve an address to spend XOC tokens",
    schema: ApproveXocSchema,
  })
  async approveXoc(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ApproveXocSchema>,
  ): Promise<string> {
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
  }

  @CreateAction({
    name: "get-xoc-balance",
    description: "Get XOC token balance for an address",
    schema: GetXocBalanceSchema,
  })
  async getXocBalance(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetXocBalanceSchema>,
  ): Promise<string> {
    const balance = await walletProvider.readContract({
      address: XOCOLATL_ADDRESS as Hex,
      abi: XOCOLATL_ABI,
      functionName: "balanceOf",
      args: [args.address as Hex],
    }) as bigint;

    return `XOC balance for ${args.address}: ${balance.toString()}`;
  }

  @CreateAction({
    name: "mint-xoc",
    description: "Mint new XOC tokens (requires MINTER_ROLE)",
    schema: MintXocSchema,
  })
  async mintXoc(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof MintXocSchema>,
  ): Promise<string> {
    const data = encodeFunctionData({
      abi: XOCOLATL_ABI,
      functionName: "mint",
      args: [args.to as Hex, BigInt(args.amount)],
    });

    const tx = await walletProvider.sendTransaction({
      to: XOCOLATL_ADDRESS as Hex,
      data,
    });

    await walletProvider.waitForTransactionReceipt(tx);
    return `Successfully minted ${args.amount} XOC to ${args.to}`;
  }

  @CreateAction({
    name: "burn-xoc",
    description: "Burn XOC tokens (requires BURNER_ROLE)",
    schema: BurnXocSchema,
  })
  async burnXoc(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof BurnXocSchema>,
  ): Promise<string> {
    const data = encodeFunctionData({
      abi: XOCOLATL_ABI,
      functionName: "burn",
      args: [args.from as Hex, BigInt(args.amount)],
    });

    const tx = await walletProvider.sendTransaction({
      to: XOCOLATL_ADDRESS as Hex,
      data,
    });

    await walletProvider.waitForTransactionReceipt(tx);
    return `Successfully burned ${args.amount} XOC from ${args.from}`;
  }

  @CreateAction({
    name: "flash-loan",
    description: "Execute a flash loan of XOC tokens",
    schema: FlashLoanSchema,
  })
  async flashLoan(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof FlashLoanSchema>,
  ): Promise<string> {
    const data = encodeFunctionData({
      abi: XOCOLATL_ABI,
      functionName: "flashLoan",
      args: [
        args.receiver as Hex,
        args.token as Hex,
        BigInt(args.amount),
        args.data as Hex,
      ],
    });

    const tx = await walletProvider.sendTransaction({
      to: XOCOLATL_ADDRESS as Hex,
      data,
    });

    await walletProvider.waitForTransactionReceipt(tx);
    return `Successfully executed flash loan of ${args.amount} tokens to ${args.receiver}`;
  }

  @CreateAction({
    name: "deposit-reserve",
    description: "Deposit collateral into House of Reserve",
    schema: HouseOfReserveSchema,
  })
  async depositReserve(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof HouseOfReserveSchema>,
  ): Promise<string> {
    const data = encodeFunctionData({
      abi: HOUSE_OF_RESERVE_ABI,
      functionName: "deposit",
      args: [BigInt(args.amount)],
    });

    const tx = await walletProvider.sendTransaction({
      to: HOUSE_OF_RESERVE_ADDRESS as Hex,
      data,
    });

    await walletProvider.waitForTransactionReceipt(tx);
    return `Successfully deposited ${args.amount} collateral`;
  }

  @CreateAction({
    name: "withdraw-reserve",
    description: "Withdraw collateral from House of Reserve",
    schema: HouseOfReserveSchema,
  })
  async withdrawReserve(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof HouseOfReserveSchema>,
  ): Promise<string> {
    const data = encodeFunctionData({
      abi: HOUSE_OF_RESERVE_ABI,
      functionName: "withdraw",
      args: [BigInt(args.amount)],
    });

    const tx = await walletProvider.sendTransaction({
      to: HOUSE_OF_RESERVE_ADDRESS as Hex,
      data,
    });

    await walletProvider.waitForTransactionReceipt(tx);
    return `Successfully withdrew ${args.amount} collateral`;
  }

  @CreateAction({
    name: "borrow-xoc",
    description: "Borrow XOC tokens from House of Coin",
    schema: HouseOfCoinSchema,
  })
  async borrowXoc(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof HouseOfCoinSchema>,
  ): Promise<string> {
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
  }

  @CreateAction({
    name: "repay-xoc",
    description: "Repay XOC tokens to House of Coin",
    schema: HouseOfCoinSchema,
  })
  async repayXoc(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof HouseOfCoinSchema>,
  ): Promise<string> {
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
  }

  @CreateAction({
    name: "liquidate-account",
    description: "Liquidate an undercollateralized account",
    schema: LiquidateSchema,
  })
  async liquidateAccount(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof LiquidateSchema>,
  ): Promise<string> {
    const data = encodeFunctionData({
      abi: LIQUIDATOR_ABI,
      functionName: "liquidateUser",
      args: [
        args.account as Hex,
        HOUSE_OF_RESERVE_ADDRESS as Hex,
      ],
    });

    const tx = await walletProvider.sendTransaction({
      to: ACCOUNT_LIQUIDATOR_ADDRESS as Hex,
      data,
    });

    await walletProvider.waitForTransactionReceipt(tx);
    return `Successfully liquidated account ${args.account}`;
  }

  supportsNetwork = (network: Network) => network.protocolFamily === "evm";
}

export const xocolatlActionProvider = () => new XocolatlActionProvider();
