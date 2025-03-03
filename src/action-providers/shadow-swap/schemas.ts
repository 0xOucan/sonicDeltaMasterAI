import { z } from "zod";

// Schema for swapping USDC.e to wS
export const SwapUsdcEToWsSchema = z.object({
  amount: z.string().min(1),
  slippageTolerancePercent: z.number().optional().default(0.5),
});

// Schema for swapping wS to USDC.e
export const SwapWsToUsdcESchema = z.object({
  amount: z.string().min(1),
  slippageTolerancePercent: z.number().optional().default(0.5),
});

// Schema for token approval
export const ApproveTokenSchema = z.object({
  token: z.enum(["USDC.e", "wS"]),
  amount: z.string().min(1),
});

// Schema to check token allowance
export const CheckAllowanceSchema = z.object({
  token: z.enum(["USDC.e", "wS"]),
});