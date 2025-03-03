import { z } from "zod";

export const SwapForUsdcSchema = z.object({
  amount: z.string(),
  token: z.enum(["S", "wS"])
});

export const SwapUsdcForSSchema = z.object({
  amount: z.string()
});