import { z } from "zod";

export const SupplyUSDCeSchema = z
  .object({
    amount: z.string()
      .transform(val => !val.includes('.') ? val + '.0' : val)
      .describe("The amount of USDC.e to supply to Aave (e.g., '1.0' for 1 USDC.e)"),
  })
  .strip();

export const SupplyWETHSchema = z
  .object({
    amount: z.string()
      .transform(val => !val.includes('.') ? val + '.0' : val)
      .describe("The amount of WETH to supply to Aave (e.g., '0.1' for 0.1 WETH)"),
  })
  .strip();

export const ApproveUSDCeSchema = z
  .object({
    amount: z.string().describe("The amount of USDC.e to approve for Aave protocol"),
  })
  .strip();

export const ApproveWETHSchema = z
  .object({
    amount: z.string().describe("The amount of WETH to approve for Aave protocol"),
  })
  .strip();

export const WithdrawUSDCeSchema = z
  .object({
    amount: z.string()
      .transform(val => !val.includes('.') ? val + '.0' : val)
      .describe("The amount of USDC.e to withdraw from Aave (e.g., '1.0' for 1 USDC.e)"),
  })
  .strip();

export const WithdrawWETHSchema = z
  .object({
    amount: z.string()
      .transform(val => !val.includes('.') ? val + '.0' : val)
      .describe("The amount of WETH to withdraw from Aave (e.g., '0.1' for 0.1 WETH)"),
  })
  .strip();

export const BorrowSchema = z.object({
  asset: z.enum(["USDC_E", "WETH", "WS"]),
  amount: z.string().min(1),
});

export const RepaySchema = z.object({
  asset: z.enum(["USDC_E", "WETH", "WS"]),
  amount: z.string().min(1),
});