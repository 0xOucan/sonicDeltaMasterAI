import { z } from "zod";

export const TransferXocSchema = z.object({
  to: z.string().describe("The destination address to receive XOC tokens"),
  amount: z.string().describe("The amount of XOC tokens to transfer"),
});

export const ApproveXocSchema = z.object({
  spender: z.string().describe("The address to approve spending XOC tokens"),
  amount: z.string().describe("The amount of XOC tokens to approve"),
});

export const GetXocBalanceSchema = z.object({
  address: z.string().describe("The address to check XOC balance for"),
});

export const MintXocSchema = z.object({
  to: z.string().describe("The address to mint XOC tokens to"),
  amount: z.string().describe("The amount of XOC tokens to mint"),
});

export const BurnXocSchema = z.object({
  from: z.string().describe("The address to burn XOC tokens from"),
  amount: z.string().describe("The amount of XOC tokens to burn"),
});

export const FlashLoanSchema = z.object({
  receiver: z.string().describe("The address of the flash loan receiver"),
  token: z.string().describe("The token address for the flash loan"),
  amount: z.string().describe("The amount to flash loan"),
  data: z.string().describe("Additional data for the flash loan"),
});

export const HouseOfReserveSchema = z.object({
  amount: z.string().describe("The amount of collateral to deposit/withdraw"),
});

export const HouseOfCoinSchema = z.object({
  amount: z.string().describe("The amount of XOC to borrow/repay"),
});

export const LiquidateSchema = z.object({
  account: z.string().describe("The account address to liquidate"),
});
