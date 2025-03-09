import { Markup } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram';

// Main menu buttons
export function getMainMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('💰 Check Balances', 'action_balance'),
      Markup.button.callback('📊 Beefy Portfolio', 'action_beefy')
    ],
    [
      Markup.button.callback('🏦 MachFi Dashboard', 'action_machfi'),
      Markup.button.callback('📐 Delta Neutral', 'action_delta_neutral')
    ],
    [
      Markup.button.callback('📈 Strategy APYs', 'action_delta_neutral_apy'),
      Markup.button.callback('❓ Help', 'action_help')
    ]
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
  { command: 'start', description: 'Start the bot' },
  { command: 'menu', description: 'Show main menu' },
  { command: 'balance', description: 'Check wallet balances' },
  { command: 'beefy', description: 'View Beefy portfolio' },
  { command: 'machfi', description: 'View MachFi dashboard' },
  { command: 'deltaneutral', description: 'Delta neutral strategies' },
  { command: 'apys', description: 'Compare strategy APYs' },
  { command: 'help', description: 'Get help with commands' }
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
  return `
## 🤖 SonicDeltaAIMASTER Commands

${getCommandsList()}

Click on any command above to execute it, or use the buttons below to navigate:
`;
} 