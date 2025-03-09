import { Telegraf, session } from 'telegraf';
import { 
  handleStart, 
  handleMenu, 
  handleDeltaNeutralMenu,
  handleHelp 
} from './commandHandlers';
import { COMMANDS_LIST } from './menuHandler';
import { handleActionCallbacks } from './callbackHandlers';

export async function initTelegramBot(token: string, agent: any) {
  const bot = new Telegraf(token);
  
  // Set up session middleware
  bot.use(session());
  
  // Set commands for menu button
  await bot.telegram.setMyCommands(COMMANDS_LIST);
  
  // Register command handlers
  bot.command('start', (ctx) => handleStart(ctx));
  bot.command('menu', (ctx) => handleMenu(ctx));
  bot.command('deltaneutral', (ctx) => handleDeltaNeutralMenu(ctx));
  bot.command('help', (ctx) => handleHelp(ctx));
  bot.command('balance', (ctx) => handleActionCallbacks(ctx, 'action_balance', agent));
  bot.command('beefy', (ctx) => handleActionCallbacks(ctx, 'action_beefy', agent));
  bot.command('machfi', (ctx) => handleActionCallbacks(ctx, 'action_machfi', agent));
  bot.command('apys', (ctx) => handleActionCallbacks(ctx, 'action_delta_neutral_apy', agent));
  
  // Special kill command for development
  bot.command('kill', (ctx) => {
    ctx.reply('Shutting down the application...');
    console.log('Kill command issued by user', ctx.from?.username);
    console.log('Kill command received. Shutting down...');
    process.exit(0);
  });
  
  // Handle callback queries from inline keyboards
  bot.on('callback_query', (ctx) => {
    // Ensure that callback data exists before accessing it
    const callbackData = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    
    if (!callbackData) {
      console.error('Callback query received without data');
      return handleMenu(ctx);
    }
    
    console.log('Callback query received:', callbackData);
    
    // Special case for returning to main menu
    if (callbackData === 'action_main_menu') {
      return handleMenu(ctx);
    }
    
    // Special case for delta neutral menu
    if (callbackData === 'action_delta_neutral') {
      return handleDeltaNeutralMenu(ctx);
    }
    
    // Handle all other actions
    return handleActionCallbacks(ctx, callbackData, agent);
  });
  
  // Start the bot
  await bot.launch();
  console.log('Telegram bot initialized. Waiting for /start command...');
  
  return bot;
} 