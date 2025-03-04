import { z } from "zod";

export const DepositUSDCeSwapXSchema = z.object({
  amount: z.string().min(1),
});

export const ApproveSwapXSchema = z.object({
  amount: z.string().min(1),
});

export const ApproveBeefySchema = z.object({
  amount: z.string().min(1),
});

export const DepositBeefySchema = z.object({
  amount: z.string().min(1),
}); 