import { Context } from 'telegraf';
import { getMainMenuKeyboard } from './menuHandler';
import { showMachFiSupplyForm, showBeefyWithdrawForm } from './forms';

export async function handleActionCallbacks(ctx: Context, action: string, agent: any) {
  try {
    // If this is a callback query, answer it to remove loading state
    if ('callback_query' in ctx.update) {
      await ctx.answerCbQuery();
    }
    
    // Show loading message for actions that might take time
    let loadingMsg;
    if (action !== 'action_help' && action !== 'action_main_menu') {
      loadingMsg = await ctx.reply('Processing your request...');
    }
    
    // Process different actions
    switch (action) {
      case 'action_balance':
        console.log('Processing action: check balances');
        const balanceResult = await agent.executeAction('check-balance');
        await ctx.reply(balanceResult, { 
          parse_mode: 'Markdown',
          ...getMainMenuKeyboard()
        });
        break;
        
      case 'action_beefy':
        console.log('Processing action: check portfolio');
        const beefyResult = await agent.executeAction('check-beefy-portfolio');
        await ctx.reply(beefyResult, { 
          parse_mode: 'Markdown',
          ...getMainMenuKeyboard()
        });
        break;
        
      case 'action_machfi':
        console.log('Processing action: machfi-dashboard');
        const machfiResult = await agent.executeAction('machfi-dashboard');
        await ctx.reply(machfiResult, { 
          parse_mode: 'Markdown',
          ...getMainMenuKeyboard()
        });
        break;
        
      case 'action_delta_neutral_apy':
        console.log('Processing action: delta-neutral-apy');
        const apyResult = await agent.executeAction('delta-neutral-apy');
        await ctx.reply(apyResult, { 
          parse_mode: 'Markdown',
          ...getMainMenuKeyboard()
        });
        break;
        
      case 'action_machfi_supply':
        return showMachFiSupplyForm(ctx);
        
      case 'action_beefy_withdraw':
        return showBeefyWithdrawForm(ctx);
        
      // Add more action handlers as needed
    }
    
    // Delete loading message if it was shown
    if (loadingMsg) {
      await ctx.deleteMessage(loadingMsg.message_id);
    }
    
  } catch (error: unknown) {
    console.error('Error handling action callback:', error);
    await ctx.reply(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`, {
      ...getMainMenuKeyboard()
    });
  }
} 