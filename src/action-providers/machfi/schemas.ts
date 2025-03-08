import { z } from "zod";

export const SupplyUSDCeSchema = z
  .object({
    amount: z.string()
      .transform(val => !val.includes('.') ? val + '.0' : val)
      .describe("The amount of USDC.e to supply to MachFi (e.g., '1.0' for 1 USDC.e)"),
  })
  .strip();

export const SupplySSchema = z
  .object({
    amount: z.string()
      .transform(val => !val.includes('.') ? val + '.0' : val)
      .describe("The amount of S (native Sonic) to supply to MachFi (e.g., '10.0' for 10 S)"),
  })
  .strip();

export const BorrowSchema = z
  .object({
    asset: z.enum(["USDC_E", "S"]),
    amount: z.string().min(1),
  })
  .describe("Borrow assets from MachFi");

export const RepaySchema = z
  .object({
    asset: z.enum(["USDC_E", "S"]),
    amount: z.string().min(1),
  })
  .describe("Repay borrowed assets to MachFi");

export const WithdrawSchema = z
  .object({
    asset: z.enum(["USDC_E", "S"]),
    amount: z.string().min(1),
  })
  .describe("Withdraw supplied assets from MachFi"); 