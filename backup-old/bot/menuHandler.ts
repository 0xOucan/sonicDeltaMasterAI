import { Markup } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram';

// Main menu buttons
export function getMainMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('💰 Check Portfolio', 'action_balance'),
      Markup.button.callback('💼 Wallet', 'action_wallet')
    ],
    [
      Markup.button.callback('💹 DeFi Strategies', 'menu_defi_strategies'),
      Markup.button.callback('🔄 Token Operations', 'menu_token_operations')
    ],
    [
      Markup.button.callback('📐 Delta Neutral', 'action_delta_neutral'),
      Markup.button.callback('🏦 MachFi', 'action_machfi')
    ],
    [
      Markup.button.callback('💱 SwapX', 'menu_swapx'),
      Markup.button.callback('❓ Help', 'action_help')
    ]
  ]);
}

// DeFi Strategies submenu buttons
export function getDefiStrategiesMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🔷 wS SwapX Strategy', 'action_ws_strategy_info'),
      Markup.button.callback('💵 USDC.e SwapX Strategy', 'action_usdc_strategy_info')
    ],
    [
      Markup.button.callback('🐮 Beefy Portfolio', 'action_beefy'),
      Markup.button.callback('📊 APY Comparison', 'action_delta_neutral_apy')
    ],
    [Markup.button.callback('🔙 Back to Main Menu', 'action_main_menu')]
  ]);
}

// Token Operations submenu buttons
export function getTokenOperationsMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🔄 Wrap S', 'command_wrap'),
      Markup.button.callback('🔄 Unwrap wS', 'command_unwrap')
    ],
    [
      Markup.button.callback('📤 Transfer', 'command_transfer'),
      Markup.button.callback('✅ Approve', 'command_approve')
    ],
    [Markup.button.callback('🔙 Back to Main Menu', 'action_main_menu')]
  ]);
}

// SwapX submenu buttons
export function getSwapXMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🔄 S to USDC.e', 'command_swap_s_to_usdc'),
      Markup.button.callback('🔄 USDC.e to S', 'command_swap_usdc_to_s')
    ],
    [
      Markup.button.callback('💱 Custom Swap', 'command_custom_swap'),
      Markup.button.callback('📊 Swap Rates', 'command_swap_rates')
    ],
    [Markup.button.callback('🔙 Back to Main Menu', 'action_main_menu')]
  ]);
}

// Delta Neutral submenu buttons
export function getDeltaNeutralMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🔍 View Strategy Details', 'action_delta_neutral_details'),
      Markup.button.callback('🚀 Execute Strategy', 'action_delta_neutral_execute')
    ],
    [
      Markup.button.callback('📊 Compare APYs', 'action_delta_neutral_apy'),
      Markup.button.callback('⚠️ Risks & Warnings', 'action_delta_neutral_risks')
    ],
    [Markup.button.callback('🔙 Back to Main Menu', 'action_main_menu')]
  ]);
}

// Commands description for the menu button
export const COMMANDS_LIST = [
  { command: 'start', description: '🚀 Start the bot' },
  { command: 'menu', description: '📋 Show main menu' },
  { command: 'balance', description: '💰 Check wallet balances' },
  { command: 'beefy', description: '🐮 View Beefy portfolio' },
  { command: 'machfi', description: '🏦 View MachFi dashboard' },
  { command: 'deltaneutral', description: '📐 Delta neutral strategies' },
  { command: 'apys', description: '📈 Compare strategy APYs' },
  { command: 'help', description: '❓ Get help with commands' }
];

// Command list with markdown formatting for easy copying
export function getCommandsList() {
  return `
### 📋 Available Commands

${COMMANDS_LIST.map(cmd => `- \`/${cmd.command}\` - ${cmd.description}`).join('\n')}

### 🔗 Quick Command Links

${COMMANDS_LIST.map(cmd => `- [/${cmd.command}](/${cmd.command}) - ${cmd.description}`).join('\n')}
`;
}

// Format message for sharing commands
export function formatCommandsMessage() {
  return `# 🤖 deFΔI Menu

## 💰 Portfolio & Balance Commands
- \`/balance\` - Check your complete wallet and DeFi portfolio
- \`/beefy\` - View Beefy vault positions and APYs
- \`/aave\` - View Aave lending positions and metrics
- \`/machfi\` - View MachFi lending dashboard

## 🔄 Token Operations
- \`/wrap <amount>\` - Wrap S tokens to wS (e.g. \`/wrap 3\`)
- \`/unwrap <amount>\` - Unwrap wS back to S tokens (e.g. \`/unwrap 4\`)
- \`/transfer <amount> <token> <address>\` - Transfer tokens to another address

## 🏦 MachFi Operations
- \`/supplycollateral <amount> <asset>\` - Supply collateral to MachFi (e.g. \`/supplycollateral 100 USDC.e\`)
- \`/borrow <amount> <asset>\` - Borrow from MachFi (e.g. \`/borrow 5 S\`)
- \`/repay <amount> <asset>\` - Repay borrowed assets (e.g. \`/repay 5 S\`)

## 📊 Delta Neutral Strategies
- \`/deltaapy\` - Check delta neutral strategy APYs for MachFi and Aave
- \`/executemachfidelta <amount>\` - Execute MachFi delta neutral strategy (e.g. \`/executemachfidelta 50\`)
- \`/executeaavedelta <amount>\` - Execute Aave delta neutral strategy (e.g. \`/executeaavedelta 50\`)

## 🚀 SwapX-Beefy Strategies
- \`/wsstrategies\` - View wS SwapX-Beefy strategy information and APY
- \`/usdcstrategies\` - View USDC.e SwapX-Beefy strategy information and APY
- \`/executews <amount>\` - Execute wS strategy (e.g. \`/executews 5\`)
- \`/executeusdce <amount>\` - Execute USDC.e strategy (e.g. \`/executeusdce 100\`)

## ⚙️ System Commands
- \`/menu\` - Show this menu
- \`/demo\` - Run a demonstration of key features
- \`/help\` - Display help information
- \`/exit\` - Return to terminal mode
- \`/kill\` - Shut down the application`;
} 