import { Context } from 'telegraf';
import { 
  getMainMenuKeyboard, 
  formatCommandsMessage, 
  getDefiStrategiesMenuKeyboard,
  getTokenOperationsMenuKeyboard,
  getSwapXMenuKeyboard,
  getDeltaNeutralMenuKeyboard
} from './menuHandler';
import { showMachFiSupplyForm, showBeefyWithdrawForm } from './forms';

// Add a mapping from UI action names to actual action provider action names
const ACTION_MAPPING: { [key: string]: string } = {
  'action_balance': 'check-balances',
  'action_wallet': 'check-wallet',
  'action_beefy': 'check-portfolio',
  'action_machfi': 'machfi-dashboard',
  'action_delta_neutral_apy': 'delta-neutral-apy',
  'action_ws_strategy_info': 'ws-strategy-info',
  'action_usdc_strategy_info': 'usdc-strategy-info',
  // Add more specific mappings here
  'action_delta_neutral_details': 'delta-neutral-info',
  'action_delta_neutral_execute': 'execute-machfi-delta-neutral',
  'action_delta_neutral_risks': 'delta-neutral-risks'
};

// Create a safety-enhanced action mapping that explicitly defines which actions should execute transactions
const TRANSACTION_ACTIONS = [
  'execute-machfi-delta-neutral',
  'execute-aave-delta-neutral',
  'wrap-s',
  'unwrap-ws',
  'transfer',
  'swapx-s-to-usdce',
  'swapx-usdce-to-s',
  'machfi-supply'
];

// Function to check if an action might execute a transaction (for safety warnings)
function isTransactionAction(action: string): boolean {
  return TRANSACTION_ACTIONS.includes(action) || 
    action.startsWith('execute-') || 
    action.startsWith('swap') ||
    action.includes('supply') ||
    action.includes('borrow') ||
    action.includes('repay');
}

// Function to determine if action was triggered by a button vs explicit command
function isButtonTriggeredAction(action: string, ctx: Context): boolean {
  // Check if this is a callback query (button click)
  return 'callback_query' in ctx.update;
}

export async function handleActionCallbacks(ctx: Context, action: string, agent: any) {
  try {
    // If this is a callback query, answer it to remove loading state
    if ('callback_query' in ctx.update) {
      await ctx.answerCbQuery();
    }
    
    // Show loading message for actions that might take time
    let loadingMsg;
    if (action !== 'action_help' && action !== 'action_main_menu' && 
        !action.startsWith('menu_') && !action.startsWith('command_')) {
      loadingMsg = await ctx.reply('⏳ Processing your request...');
    }
    
    // Map the action to the appropriate backend action
    const mappedAction = ACTION_MAPPING[action] || action;
    
    // Safety check: Only block dangerous transactions from button clicks, not explicit commands
    const isButtonClick = isButtonTriggeredAction(action, ctx);
    const isDangerousAction = isTransactionAction(mappedAction);
    
    // Only show warnings and block actions when they're triggered by buttons
    if (isButtonClick && isDangerousAction && !action.startsWith('command_')) {
      await ctx.reply(`⚠️ **CAUTION**: This action will execute a transaction that may use your funds.\n\nPlease use the explicit command instead for better control and safety.`, {
        parse_mode: 'Markdown',
        ...getMainMenuKeyboard()
      });
      
      // Delete loading message if it was shown
      if (loadingMsg) {
        await ctx.deleteMessage(loadingMsg.message_id);
      }
      
      return; // Prevent automatic execution from button click
    }
    
    // Process different actions
    switch (action) {
      // Main actions
      case 'action_balance':
        console.log('Processing balance command');
        try {
          const balanceResult = await agent.executeAction(ACTION_MAPPING[action] || 'check-balances');
          await ctx.reply(balanceResult, { 
            parse_mode: 'Markdown',
            ...getMainMenuKeyboard()
          });
        } catch (error: unknown) {
          console.error('Error executing balance action:', error);
          await ctx.reply(`❌ Error checking balances: ${error instanceof Error ? error.message : String(error)}`, {
            ...getMainMenuKeyboard()
          });
        }
        break;
        
      case 'action_wallet':
        console.log('Processing wallet command');
        try {
          const walletResult = await agent.executeAction(ACTION_MAPPING[action] || 'check-wallet');
          await ctx.reply(walletResult || "Wallet information is currently unavailable.", { 
            parse_mode: 'Markdown',
            ...getMainMenuKeyboard()
          });
        } catch (error: unknown) {
          console.error('Error executing wallet action:', error);
          await ctx.reply(`❌ Error checking wallet: ${error instanceof Error ? error.message : String(error)}`, {
            ...getMainMenuKeyboard()
          });
        }
        break;
        
      case 'action_beefy':
        console.log('Processing beefy command');
        try {
          const beefyResult = await agent.executeAction(ACTION_MAPPING[action] || 'check-portfolio');
          await ctx.reply(beefyResult, { 
            parse_mode: 'Markdown',
            ...getDefiStrategiesMenuKeyboard()
          });
        } catch (error: unknown) {
          console.error('Error executing beefy action:', error);
          await ctx.reply(`❌ Error checking Beefy portfolio: ${error instanceof Error ? error.message : String(error)}`, {
            ...getDefiStrategiesMenuKeyboard()
          });
        }
        break;
        
      case 'action_machfi':
        console.log('Processing machfi command');
        try {
          const machfiResult = await agent.executeAction(ACTION_MAPPING[action] || 'machfi-dashboard');
          await ctx.reply(machfiResult, { 
            parse_mode: 'Markdown',
            ...getMainMenuKeyboard()
          });
        } catch (error: unknown) {
          console.error('Error executing machfi action:', error);
          await ctx.reply(`❌ Error checking MachFi dashboard: ${error instanceof Error ? error.message : String(error)}`, {
            ...getMainMenuKeyboard()
          });
        }
        break;
        
      case 'action_delta_neutral_apy':
        console.log('Processing action: delta-neutral-apy');
        try {
          const apyResult = await agent.executeAction(ACTION_MAPPING[action] || 'delta-neutral-apy');
          await ctx.reply(apyResult, { 
            parse_mode: 'Markdown',
            ...getMainMenuKeyboard()
          });
        } catch (error: unknown) {
          console.error('Error executing delta neutral APY action:', error);
          await ctx.reply(`❌ Error checking delta neutral APYs: ${error instanceof Error ? error.message : String(error)}`, {
            ...getMainMenuKeyboard()
          });
        }
        break;
        
      // Strategy info actions
      case 'action_ws_strategy_info':
        console.log('Processing action: ws-strategy info');
        try {
          const wsStrategyResult = await agent.executeAction(ACTION_MAPPING[action] || 'ws-strategy-info');
          await ctx.reply(wsStrategyResult, { 
            parse_mode: 'Markdown',
            ...getDefiStrategiesMenuKeyboard()
          });
        } catch (error: unknown) {
          console.error('Error executing wS strategy info action:', error);
          await ctx.reply(`❌ Error fetching wS strategy info: ${error instanceof Error ? error.message : String(error)}`, {
            ...getDefiStrategiesMenuKeyboard()
          });
        }
        break;
        
      case 'action_usdc_strategy_info':
        console.log('Processing action: usdc-strategy info');
        try {
          const usdcStrategyResult = await agent.executeAction(ACTION_MAPPING[action] || 'usdc-strategy-info');
          await ctx.reply(usdcStrategyResult, { 
            parse_mode: 'Markdown',
            ...getDefiStrategiesMenuKeyboard()
          });
        } catch (error: unknown) {
          console.error('Error executing USDC.e strategy info action:', error);
          await ctx.reply(`❌ Error fetching USDC.e strategy info: ${error instanceof Error ? error.message : String(error)}`, {
            ...getDefiStrategiesMenuKeyboard()
          });
        }
        break;
        
      // IMPORTANT: Fix for the dangerous action_delta_neutral_details handler
      case 'action_delta_neutral_details':
        console.log('Processing action: delta-neutral-details');
        try {
          // Instead of executing a transaction, show detailed information about the strategy
          await ctx.reply(`# 📊 Delta Neutral Strategy Details

## 🧩 How It Works
Delta neutral strategies help you earn yield while minimizing exposure to token price volatility.

### MachFi Delta Neutral Strategy Steps:
1. 💰 Deposit USDC.e as collateral in MachFi
2. 🏦 Borrow S tokens (at 50% LTV)
3. 🔄 Wrap the S tokens to wS
4. 🌾 Deposit the wS in Beefy's high-APY vault

### Risk Management
- ✅ Maintain 50% LTV (Loan-to-Value) ratio
- ✅ Monitor health factor regularly
- ✅ Be aware of liquidation thresholds

### Available Funds
- USDC.e: 2.1112 (available in wallet)
- Current APY: ~138.54%

### Execute
To execute this strategy safely, use the command:
\`/executemachfidelta <amount>\`

Example: \`/executemachfidelta 2\` to use 2 USDC.e

⚠️ Never execute strategies with funds you cannot afford to lose.`,
            { 
              parse_mode: 'Markdown',
              ...getDeltaNeutralMenuKeyboard()
            }
          );
        } catch (error: unknown) {
          console.error('Error displaying delta neutral details:', error);
          await ctx.reply(`❌ Error showing delta neutral details: ${error instanceof Error ? error.message : String(error)}`, {
            ...getDeltaNeutralMenuKeyboard()
          });
        }
        break;
        
      // Add another handler for delta neutral risks
      case 'action_delta_neutral_risks':
        console.log('Processing action: delta-neutral-risks');
        try {
          await ctx.reply(`# ⚠️ Delta Neutral Strategy Risks

## 🚨 Key Risk Factors

### 📉 Liquidation Risk
If the price of S tokens changes significantly, your position might get liquidated if:
- The health factor drops below 1 (for Aave)
- The LTV exceeds the liquidation threshold (for MachFi)

### 🌊 Pool Volatility
- SwapX liquidity pools can experience imbalance during market volatility
- This may affect entry and exit prices

### 💰 APY Fluctuations
- Yield farming APYs are not guaranteed and can change based on:
  - Market conditions
  - Total value locked
  - Protocol changes

### 🔄 Smart Contract Risk
- All DeFi protocols carry smart contract risk
- While audited, vulnerabilities can still exist

### 🛡️ Risk Mitigation
- Only use funds you can afford to lose
- Start with smaller amounts to test the strategy
- Monitor your position regularly
- Set up alerts for health factor changes

Remember that no investment strategy is risk-free. Always do your own research and understand the risks before committing funds.`,
            { 
              parse_mode: 'Markdown',
              ...getDeltaNeutralMenuKeyboard()
            }
          );
        } catch (error: unknown) {
          console.error('Error displaying delta neutral risks:', error);
          await ctx.reply(`❌ Error showing delta neutral risks: ${error instanceof Error ? error.message : String(error)}`, {
            ...getDeltaNeutralMenuKeyboard()
          });
        }
        break;
        
      // Add a handler for delta neutral execute action to safely prompt for command use
      case 'action_delta_neutral_execute':
        console.log('Processing action: delta-neutral-execute');
        try {
          // Instead of directly executing a transaction, show instructions for using explicit commands
          await ctx.reply(`# ⚠️ Execute Delta Neutral Strategy Safely

For your security, please use the explicit command instead of this button to execute a strategy:

## MachFi Strategy (Recommended)
Use:
\`/executemachfidelta <amount>\`

Example: \`/executemachfidelta 2\` to use 2 USDC.e as collateral

## Aave Strategy (Alternative)
Use:
\`/executeaavedelta <amount>\`

Example: \`/executeaavedelta 2\` to use 2 USDC.e as collateral

⚠️ Only execute with funds you can afford to lose.

## Current Wallet Balance
USDC.e: 2.1112

## Current APY
MachFi Strategy: ~138.54%`,
            { 
              parse_mode: 'Markdown',
              ...getDeltaNeutralMenuKeyboard()
            }
          );
        } catch (error: unknown) {
          console.error('Error displaying execute options:', error);
          await ctx.reply(`❌ Error showing execute options: ${error instanceof Error ? error.message : String(error)}`, {
            ...getDeltaNeutralMenuKeyboard()
          });
        }
        break;
        
      // Add a handler for the help button
      case 'action_help':
        console.log('Processing help action');
        try {
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
        } catch (error: unknown) {
          console.error('Error displaying help:', error);
          await ctx.reply(`❌ Error showing help: ${error instanceof Error ? error.message : String(error)}`, {
            ...getMainMenuKeyboard()
          });
        }
        break;
        
      // Handle form callbacks
      case 'form_machfi_supply_usdc':
        console.log('Processing form: MachFi supply USDC.e');
        try {
          await ctx.reply('Please provide the amount of USDC.e to supply using the command:\n`/supplycollateral <amount> USDC.e`\n\nExample: `/supplycollateral 10 USDC.e`', {
            parse_mode: 'Markdown',
            ...getMainMenuKeyboard()
          });
        } catch (error: unknown) {
          console.error('Error displaying MachFi supply USDC.e form:', error);
          await ctx.reply(`❌ Error: ${error instanceof Error ? error.message : String(error)}`, {
            ...getMainMenuKeyboard()
          });
        }
        break;
        
      case 'form_machfi_supply_s':
        console.log('Processing form: MachFi supply S');
        try {
          await ctx.reply('Please provide the amount of S to supply using the command:\n`/supplycollateral <amount> S`\n\nExample: `/supplycollateral 5 S`', {
            parse_mode: 'Markdown',
            ...getMainMenuKeyboard()
          });
        } catch (error: unknown) {
          console.error('Error displaying MachFi supply S form:', error);
          await ctx.reply(`❌ Error: ${error instanceof Error ? error.message : String(error)}`, {
            ...getMainMenuKeyboard()
          });
        }
        break;
        
      case 'form_beefy_withdraw_usdc':
        console.log('Processing form: Beefy withdraw USDC.e strategy');
        try {
          await ctx.reply('To withdraw from your USDC.e strategy position, use the command:\n`/withdraw from usdc-strategy`', {
            parse_mode: 'Markdown',
            ...getMainMenuKeyboard()
          });
        } catch (error: unknown) {
          console.error('Error displaying Beefy withdraw USDC.e form:', error);
          await ctx.reply(`❌ Error: ${error instanceof Error ? error.message : String(error)}`, {
            ...getMainMenuKeyboard()
          });
        }
        break;
        
      case 'form_beefy_withdraw_ws':
        console.log('Processing form: Beefy withdraw wS strategy');
        try {
          await ctx.reply('To withdraw from your wS strategy position, use the command:\n`/withdraw from ws-strategy`', {
            parse_mode: 'Markdown',
            ...getMainMenuKeyboard()
          });
        } catch (error: unknown) {
          console.error('Error displaying Beefy withdraw wS form:', error);
          await ctx.reply(`❌ Error: ${error instanceof Error ? error.message : String(error)}`, {
            ...getMainMenuKeyboard()
          });
        }
        break;
        
      // Handle command buttons with usage instructions
      default:
        if (action.startsWith('command_')) {
          console.log(`Processing command button: ${action}`);
          try {
            // Show appropriate instructions based on the command
            switch (action) {
              case 'command_wrap':
                await ctx.reply("To wrap S tokens to wS, use the command:\n`/wrap <amount>`\n\nExample: `/wrap 3` to wrap 3 S tokens", {
                  parse_mode: 'Markdown',
                  ...getTokenOperationsMenuKeyboard()
                });
                break;
                
              case 'command_unwrap':
                await ctx.reply("To unwrap wS tokens back to S, use the command:\n`/unwrap <amount>`\n\nExample: `/unwrap 2` to unwrap 2 wS tokens", {
                  parse_mode: 'Markdown',
                  ...getTokenOperationsMenuKeyboard()
                });
                break;
                
              case 'command_transfer':
                await ctx.reply("To transfer tokens to another address, use the command:\n`/transfer <amount> <token> <address>`\n\nExample: `/transfer 5 wS 0x1234...`", {
                  parse_mode: 'Markdown',
                  ...getTokenOperationsMenuKeyboard()
                });
                break;
                
              case 'command_approve':
                await ctx.reply("To approve tokens for spending by a contract, use the command:\n`/approve <amount> <token> <contract_address>`\n\nExample: `/approve 10 wS 0x1234...`", {
                  parse_mode: 'Markdown',
                  ...getTokenOperationsMenuKeyboard()
                });
                break;
                
              case 'command_swap_s_to_usdc':
                await ctx.reply("To swap S tokens to USDC.e, use the command:\n`/swaps <amount>`\n\nExample: `/swaps 5` to swap 5 S tokens to USDC.e", {
                  parse_mode: 'Markdown',
                  ...getSwapXMenuKeyboard()
                });
                break;
                
              case 'command_swap_usdc_to_s':
                await ctx.reply("To swap USDC.e to S tokens, use the command:\n`/swapusdc <amount>`\n\nExample: `/swapusdc 10` to swap 10 USDC.e to S tokens", {
                  parse_mode: 'Markdown',
                  ...getSwapXMenuKeyboard()
                });
                break;
                
              case 'command_custom_swap':
                await ctx.reply("To perform a custom swap, use the following format:\n`/swap <token_from> <token_to> <amount>`\n\nExample: `/swap S USDC.e 5`", {
                  parse_mode: 'Markdown',
                  ...getSwapXMenuKeyboard()
                });
                break;
                
              case 'command_swap_rates':
                await ctx.reply("🔄 SwapX Current Rates:\n\n• 1 S ≈ 0.57 USDC.e\n• 1 USDC.e ≈ 1.75 S\n\nRates are approximate and may vary based on swap size and liquidity.", {
                  parse_mode: 'Markdown',
                  ...getSwapXMenuKeyboard()
                });
                break;
                
              case 'command_supply_collateral':
                // Show the MachFi supply form
                return showMachFiSupplyForm(ctx);
                
              case 'command_withdraw':
                // Show the Beefy withdraw form
                return showBeefyWithdrawForm(ctx);
                
              default:
                await ctx.reply(`To use this feature, please use the appropriate command from the /menu list.`, {
                  parse_mode: 'Markdown',
                  ...getMainMenuKeyboard()
                });
            }
          } catch (error: unknown) {
            console.error(`Error handling command button ${action}:`, error);
            await ctx.reply(`❌ Error: ${error instanceof Error ? error.message : String(error)}`, {
              ...getMainMenuKeyboard()
            });
          }
        } else {
          console.log(`Unknown action: ${action}`);
          await ctx.reply(`Unknown action. Please use the menu or type /help for assistance.`, {
            ...getMainMenuKeyboard()
          });
        }
    }
  } catch (error: unknown) {
    console.error('Error handling action callback:', error);
    await ctx.reply(`❌ Error handling action callback: ${error instanceof Error ? error.message : String(error)}`);
  }
}