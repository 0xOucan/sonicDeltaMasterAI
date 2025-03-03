import { z } from "zod";

export const DepositUSDCeSwapXSchema = z
  .object({
    amount: z.string()
      .transform(val => !val.includes('.') ? val + '.0' : val)
      .describe("The amount of USDC.e to deposit (e.g., '1.0' for 1 USDC.e)"),
  })
  .strip();

export const ApproveSwapXSchema = z
  .object({
    amount: z.string().describe("The amount of USDC.e to approve for SwapX vault"),
  })
  .strip();

export const ApproveBeefySchema = z
  .object({
    amount: z.string().describe("The amount of SwapX LP tokens to approve for Beefy vault"),
  })
  .strip();

export const DepositBeefySchema = z
  .object({
    amount: z.string().describe("The amount of SwapX LP tokens to deposit into Beefy vault"),
  })
  .strip(); 