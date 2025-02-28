import { z } from "zod";

export const DepositWsSwapXSchema = z
  .object({
    amount: z.string().describe("The amount of wS to deposit into SwapX (in wei)"),
  })
  .strip();

export const ApproveSwapXSchema = z
  .object({
    amount: z.string().describe("The amount of wS to approve for SwapX vault"),
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