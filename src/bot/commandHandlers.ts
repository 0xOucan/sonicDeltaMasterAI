import { Context } from 'telegraf';
import { 
  getMainMenuKeyboard, 
  getDeltaNeutralMenuKeyboard, 
  formatCommandsMessage 
} from './menuHandler';

export async function handleMenu(ctx: Context) {
  await ctx.reply(formatCommandsMessage(), {
    parse_mode: 'Markdown',
    ...getMainMenuKeyboard()
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
    '👋 Welcome to SONICdeltaAIMASTER\n\n' +
    'I\'m your AI assistant for Sonic Network, specializing in Delta Neutral DeFi strategies with comprehensive portfolio management.\n\n' +
    'Please select an option from the menu below or use commands like /menu to see available options.'
  );
  
  // Show the main menu after welcome message
  await handleMenu(ctx);
}

export async function handleHelp(ctx: Context) {
  await ctx.reply(
    '## 🆘 Help Center\n\n' +
    'This bot helps you manage DeFi strategies on Sonic Network, with a focus on delta-neutral approaches.\n\n' +
    '### What can this bot do?\n' +
    '- Check your wallet balances\n' +
    '- View your Beefy Finance portfolio\n' +
    '- Manage MachFi lending positions\n' +
    '- Compare and execute delta-neutral strategies\n\n' +
    '### Need more help?\n' +
    'Use the /menu command to see all available options.',
    {
      parse_mode: 'Markdown',
      ...getMainMenuKeyboard()
    }
  );
} 