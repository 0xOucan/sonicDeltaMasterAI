import { Context, Markup } from 'telegraf';
import { getMainMenuKeyboard } from './menuHandler';

export async function showMachFiSupplyForm(ctx: Context) {
  await ctx.reply(
    '💰 MachFi Supply Form\n\n' +
    'Choose which asset to supply to MachFi:',
    {
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('USDC.e', 'form_machfi_supply_usdc'),
          Markup.button.callback('S (Sonic)', 'form_machfi_supply_s')
        ],
        [Markup.button.callback('🔙 Back', 'action_main_menu')]
      ])
    }
  );
}

export async function showBeefyWithdrawForm(ctx: Context) {
  await ctx.reply(
    '📤 Beefy Withdrawal Form\n\n' +
    'Choose a vault to withdraw from:',
    {
      ...Markup.inlineKeyboard([
        [Markup.button.callback('USDC.e SwapX Strategy', 'form_beefy_withdraw_usdc')],
        [Markup.button.callback('wS SwapX Strategy', 'form_beefy_withdraw_ws')],
        [Markup.button.callback('🔙 Back', 'action_main_menu')]
      ])
    }
  );
} 