import { Context } from 'telegraf';
import { 
  getMainMenuKeyboard, 
  getDeltaNeutralMenuKeyboard, 
  formatCommandsMessage 
} from './menuHandler';

export async function handleMenu(ctx: Context) {
  // Send the formatted commands message with ONLY markdown, no inline keyboard
  await ctx.reply(formatCommandsMessage(), {
    parse_mode: 'Markdown'
  });
}

export async function handleDeltaNeutralMenu(ctx: Context) {
  await ctx.reply('📐 Delta Neutral Strategies\n\nChoose an option:', {
    parse_mode: 'Markdown',
    ...getDeltaNeutralMenuKeyboard()
  });
}

export async function handleStart(ctx: Context) {
  await ctx.reply(
    '👋 Welcome to deFΔI\n\n' +
    'I\'m your AI assistant for Sonic Network, specializing in Delta Neutral DeFi strategies with comprehensive portfolio management.\n\n' +
    'Please select an option from the menu below or use commands like /menu to see available options.',
    {
      parse_mode: 'Markdown',
      ...getMainMenuKeyboard()
    }
  );
}

export async function handleHelp(ctx: Context) {
  await ctx.reply(
    '# 🆘 deFΔI Help\n\n' +
    '## 🔥 Core Features: Delta Neutral Strategies\n\n' +
    '### 🏦 Aave Delta Neutral Strategy\n' +
    'Our original Delta Neutral strategy delivers stable, market-neutral yields by balancing lending and yield farming positions:\n\n' +
    '1. 💰 Supply USDC.e to Aave as collateral\n' +
    '2. 🏦 Borrow wS tokens at 50% of borrowing capacity\n' +
    '3. 🌾 Deploy borrowed wS into Beefy\'s high-yield wS-SwapX vault\n' +
    '4. 💸 Earn positive yield spread between borrowing costs and farming returns\n\n' +
    '### 🆕 MachFi Delta Neutral Strategy\n' +
    'Our new MachFi-based Delta Neutral strategy offers an alternative approach:\n\n' +
    '1. 💰 Supply USDC.e to MachFi as collateral\n' +
    '2. 🏦 Borrow S tokens at 50% of borrowing capacity\n' +
    '3. 🔄 Wrap S tokens to wS\n' +
    '4. 🌾 Deploy wS into Beefy\'s high-yield wS-SwapX vault\n' +
    '5. 💸 Earn positive yield spread between borrowing costs and farming returns\n\n' +
    '## 📋 Available Commands\n' +
    'Use /menu to see the full list of available commands.\n\n' +
    '## 🔄 Token Operations\n' +
    'Use /wrap, /unwrap, and /transfer to manage your tokens.\n\n' +
    '## 🚀 SwapX DEX Integration\n' +
    'Swap tokens using commands like /swaps or /swapusdc.',
    {
      parse_mode: 'Markdown',
      ...getMainMenuKeyboard()
    }
  );
} 