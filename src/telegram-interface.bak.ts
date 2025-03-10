import TelegramBot from "node-telegram-bot-api";
import { HumanMessage } from "@langchain/core/messages";

interface TelegramInterfaceOptions {
  onExit: () => void;
  onKill: () => void;
}

// Menu structure for inline keyboards
interface MenuOptions {
  [key: string]: {
    text: string;
    callback_data: string;
  }[];
}

export class TelegramInterface {
  private bot: TelegramBot;
  private agent: any;
  private config: any;
  private options: TelegramInterfaceOptions;
  private isStarted: boolean = false;
  private pendingAction: { type: string; data?: any } | null = null;
  
  // Store active message contexts for menu navigation
  private activeMenus: Map<number, { messageId: number, menuContext: string }> = new Map();
  
  // Define menu structures
  private mainMenu: MenuOptions = {
    row1: [
      { text: "💰 DeFi Strategies", callback_data: "menu_defi_strategies" },
      { text: "🔄 Token Operations", callback_data: "menu_token_operations" }
    ],
    row2: [
      { text: "📈 Delta Neutral", callback_data: "menu_delta_strategy" },
      { text: "💸 MachFi", callback_data: "menu_machfi" }
    ],
    row3: [
      { text: "💱 SwapX", callback_data: "menu_swapx" },
      { text: "❓ Help", callback_data: "command_help" }
    ]
  };
  
  private defiStrategiesMenu: MenuOptions = {
    row1: [
      { text: "🔷 wS SwapX 🐮", callback_data: "action_ws_strategy_info" },
      { text: "💵 USDC.e SwapX 🐮", callback_data: "action_usdc_strategy_info" }
    ],
    row2: [
      { text: "◀️ Back to Main Menu", callback_data: "menu_main" }
    ]
  };
  
  private tokenOperationsMenu: MenuOptions = {
    row1: [
      { text: "🔄 Wrap S", callback_data: "command_wrap" },
      { text: "🔄 Unwrap wS", callback_data: "command_unwrap" }
    ],
    row2: [
      { text: "📤 Transfer wS", callback_data: "command_transfer" },
      { text: "✅ Approve wS", callback_data: "command_approve" }
    ],
    row3: [
      { text: "◀️ Back to Main Menu", callback_data: "menu_main" }
    ]
  };
  
  private deltaStrategyMenu: MenuOptions = {
    row1: [
      { text: "📊 Check APY", callback_data: "action_delta_neutral_apy" },
      { text: "🚀 Execute Strategy", callback_data: "command_execute_delta" }
    ],
    row2: [
      { text: "◀️ Back to Main Menu", callback_data: "menu_main" }
    ]
  };
  
  private machfiMenu: MenuOptions = {
    row1: [
      { text: "💰 Supply Collateral", callback_data: "command_supply_collateral" },
      { text: "🏦 Borrow Assets", callback_data: "command_borrow" }
    ],
    row2: [
      { text: "💸 Repay Debt", callback_data: "command_repay" },
      { text: "📤 Withdraw Collateral", callback_data: "command_withdraw" }
    ],
    row3: [
      { text: "◀️ Back to Main Menu", callback_data: "menu_main" }
    ]
  };

  private swapXMenu: MenuOptions = {
    row1: [
      { text: "💵 S to USDC.e", callback_data: "command_swap_s_to_usdce" },
      { text: "🔷 USDC.e to S", callback_data: "command_swap_usdce_to_s" }
    ],
    row2: [
      { text: "◀️ Back to Main Menu", callback_data: "menu_main" }
    ]
  };

  constructor(agent: any, config: any, options: TelegramInterfaceOptions) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN must be provided!");
    }

    this.bot = new TelegramBot(token, { polling: true });
    this.agent = agent;
    this.config = config;
    this.options = options;

    this.setupHandlers();
    console.log("Telegram bot initialized. Waiting for /start command...");
  }

  private setupHandlers() {
    // Handle /start command
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      this.isStarted = true;
      console.log(
        `Telegram session started by user ${msg.from?.username || msg.from?.id}`,
      );
      
      // Send welcome message with main menu
      this.bot.sendMessage(
        chatId,
        "👋 *Welcome to deFΔI*\n\n" +
        "I'm your AI assistant for Sonic Network, specializing in *Delta Neutral DeFi strategies* with comprehensive portfolio management.\n\n" +
        "Please select an option from the menu below or use commands like `/menu` to see available options.",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: this.buildInlineKeyboard(this.mainMenu)
          }
        }
      );
      
      // Set the bot's menu button to open a web app with a custom menu
      this.setMenuButton(chatId);
    });

    // Handle /exit command
    this.bot.onText(/\/exit/, async (msg) => {
      const chatId = msg.chat.id;
      if (this.isStarted) {
        await this.bot.sendMessage(chatId, "Goodbye! Returning to terminal...");
        console.log(`Telegram session ended by user ${msg.from?.username || msg.from?.id}`);
        this.isStarted = false;
        this.options.onExit();
      }
    });

    // Handle /kill command
    this.bot.onText(/\/kill/, async (msg) => {
      const chatId = msg.chat.id;
      if (this.isStarted) {
        await this.bot.sendMessage(chatId, "Shutting down the application...");
        console.log(`Kill command issued by user ${msg.from?.username || msg.from?.id}`);
        this.options.onKill();
      }
    });

    // Handle /menu command
    this.bot.onText(/\/menu/, (msg) => {
      const chatId = msg.chat.id;
      if (this.isStarted) {
        this.handleMenuCommand(chatId);
      }
    });
    
    // Handle wrap command with parameter
    this.bot.onText(/\/wrap\s+(\d+\.?\d*)/, async (msg, match) => {
      if (!this.isStarted || !match) return;
      const chatId = msg.chat.id;
      const amount = match[1];
      
      console.log(`Processing wrap command: ${amount} S tokens`);
      this.processAction(chatId, `wrap ${amount} S`);
    });
    
    // Handle unwrap command with parameter
    this.bot.onText(/\/unwrap\s+(\d+\.?\d*)/, async (msg, match) => {
      if (!this.isStarted || !match) return;
      const chatId = msg.chat.id;
      const amount = match[1];
      
      console.log(`Processing unwrap command: ${amount} wS tokens`);
      this.processAction(chatId, `unwrap ${amount} wS`);
    });
    
    // Handle execute delta neutral strategy command
    this.bot.onText(/\/executedeltaneutral\s+(\d+\.?\d*)/, async (msg, match) => {
      if (!this.isStarted || !match) return;
      const chatId = msg.chat.id;
      const amount = match[1];
      
      console.log(`Processing execute delta neutral command with amount: ${amount} USDC.e`);
      this.processAction(chatId, `execute-delta-neutral ${amount}`);
    });
    
    // Handle execute wS SwapX Beefy strategy command
    this.bot.onText(/\/executefullwsswapxbeefy\s+(\d+\.?\d*)/, async (msg, match) => {
      if (!this.isStarted || !match) return;
      const chatId = msg.chat.id;
      const amount = match[1];
      
      console.log(`Processing execute wS SwapX Beefy strategy with amount: ${amount} wS`);
      this.processAction(chatId, `execute-ws-strategy ${amount}`);
    });
    
    // Handle execute USDC.e SwapX Beefy strategy command
    this.bot.onText(/\/executefullusdceswapxbeefy\s+(\d+\.?\d*)/, async (msg, match) => {
      if (!this.isStarted || !match) return;
      const chatId = msg.chat.id;
      const amount = match[1];
      
      console.log(`Processing execute USDC.e SwapX Beefy strategy with amount: ${amount} USDC.e`);
      this.processAction(chatId, `execute-usdce-strategy ${amount}`);
    });
    
    // Handle supply collateral command
    this.bot.onText(/\/supplycollateral\s+(\d+\.?\d*)\s+(\w+\.?\w*)/, async (msg, match) => {
      if (!this.isStarted || !match) return;
      const chatId = msg.chat.id;
      const amount = match[1];
      const asset = match[2];
      
      console.log(`Processing supply collateral command: ${amount} ${asset}`);
      
      // Use the appropriate action based on the asset
      let action = "";
      if (asset.toLowerCase() === "s") {
        action = `supply-s ${amount}`;
      } else if (asset.toLowerCase() === "usdc.e") {
        action = `supply-usdce ${amount}`;
      } else if (asset.toLowerCase() === "weth") {
        action = `supply-weth ${amount}`;
      } else {
        await this.bot.sendMessage(chatId, `Unsupported asset: ${asset}. Supported assets are: S, USDC.e, WETH`);
        return;
      }
      
      this.processAction(chatId, action);
    });
    
    // Handle borrow command
    this.bot.onText(/\/borrow\s+(\d+\.?\d*)\s+(\w+\.?\w*)/, async (msg, match) => {
      if (!this.isStarted || !match) return;
      const chatId = msg.chat.id;
      const amount = match[1];
      const asset = match[2];
      
      console.log(`Processing borrow command: ${amount} ${asset}`);
      this.processAction(chatId, `borrow ${amount} ${asset}`);
    });
    
    // Handle repay command
    this.bot.onText(/\/repay\s+(.+)/, async (msg, match) => {
      if (!this.isStarted || !match) return;
      const chatId = msg.chat.id;
      const args = match[1];  // Could be "full", "all", or "{amount} {asset}"
      
      console.log(`Processing repay command: ${args}`);
      this.processAction(chatId, `repay ${args}`);
    });

    // Handle demo command
    this.bot.onText(/\/demo/, (msg) => this.handleDemoCommand(msg));
    
    // Handle callback queries (button clicks)
    this.bot.on('callback_query', (query) => {
      if (!query.message) return;
      
      const chatId = query.message.chat.id;
      const messageId = query.message.message_id;
      const callbackData = query.data || "";
      
      console.log(`Callback query received: ${callbackData}`);
      
      // Acknowledge the callback query
      this.bot.answerCallbackQuery(query.id);
      
      // Process the callback data
      this.handleCallbackQuery(chatId, messageId, callbackData);
    });

    // Handle all other messages
    this.bot.on("message", async (msg) => {
      if (msg.text && !msg.text.startsWith("/") && this.isStarted) {
        this.handleMessage(msg);
      }
    });

    // Handle /balance command - alias for check balances
    this.bot.onText(/\/balance/, (msg) => {
      if (!this.isStarted) return;
      const chatId = msg.chat.id;
      console.log(`Processing balance command`);
      this.processAction(chatId, "check balances");
    });
    
    // Handle /beefy command - alias for check portfolio
    this.bot.onText(/\/beefy/, (msg) => {
      if (!this.isStarted) return;
      const chatId = msg.chat.id;
      console.log(`Processing beefy command`);
      this.processAction(chatId, "check portfolio");
    });
    
    // Handle /aave command - alias for aave dashboard
    this.bot.onText(/\/aave/, (msg) => {
      if (!this.isStarted) return;
      const chatId = msg.chat.id;
      console.log(`Processing aave command`);
      this.processAction(chatId, "aave dashboard");
    });
    
    // Handle /machfi command - alias for machfi dashboard
    this.bot.onText(/\/machfi/, (msg) => {
      if (!this.isStarted) return;
      const chatId = msg.chat.id;
      console.log(`Processing machfi command`);
      this.processAction(chatId, "machfi-dashboard");
    });
    
    // Handle /deltaapy command - alias for delta neutral apy
    this.bot.onText(/\/deltaapy/, (msg) => {
      if (!this.isStarted) return;
      const chatId = msg.chat.id;
      console.log(`Processing delta neutral apy command`);
      this.processAction(chatId, "delta-neutral-apy");
    });
    
    // Handle /wsstrategies command - alias for ws strategy info
    this.bot.onText(/\/wsstrategies/, (msg) => {
      if (!this.isStarted) return;
      const chatId = msg.chat.id;
      console.log(`Processing ws strategies command`);
      this.processAction(chatId, "ws-strategy info");
    });
    
    // Handle /usdcstrategies command - alias for usdc strategy info
    this.bot.onText(/\/usdcstrategies/, (msg) => {
      if (!this.isStarted) return;
      const chatId = msg.chat.id;
      console.log(`Processing usdc strategies command`);
      this.processAction(chatId, "usdc-strategy info");
    });
    
    // Handle /executemachfidelta command
    this.bot.onText(/\/executemachfidelta\s+(\d+\.?\d*)/, async (msg, match) => {
      if (!this.isStarted || !match) return;
      const chatId = msg.chat.id;
      const amount = match[1];
      
      console.log(`Processing execute MachFi delta neutral command with amount: ${amount} USDC.e`);
      this.processAction(chatId, `execute-machfi-delta-neutral ${amount}`);
    });
    
    // Handle /executeaavedelta command
    this.bot.onText(/\/executeaavedelta\s+(\d+\.?\d*)/, async (msg, match) => {
      if (!this.isStarted || !match) return;
      const chatId = msg.chat.id;
      const amount = match[1];
      
      console.log(`Processing execute Aave delta neutral command with amount: ${amount} USDC.e`);
      this.processAction(chatId, `execute-aave-delta-neutral ${amount}`);
    });
    
    // Handle /executews command - alias for executefullwsswapxbeefy
    this.bot.onText(/\/executews\s+(\d+\.?\d*)/, async (msg, match) => {
      if (!this.isStarted || !match) return;
      const chatId = msg.chat.id;
      const amount = match[1];
      
      console.log(`Processing execute wS strategy command with amount: ${amount} wS`);
      this.processAction(chatId, `execute-ws-strategy ${amount}`);
    });
    
    // Handle /executeusdce command - alias for executefullusdceswapxbeefy
    this.bot.onText(/\/executeusdce\s+(\d+\.?\d*)/, async (msg, match) => {
      if (!this.isStarted || !match) return;
      const chatId = msg.chat.id;
      const amount = match[1];
      
      console.log(`Processing execute USDC.e strategy command with amount: ${amount} USDC.e`);
      this.processAction(chatId, `execute-usdce-strategy ${amount}`);
    });
    
    // Handle /transfer command
    this.bot.onText(/\/transfer\s+(\d+\.?\d*)\s+(\w+\.?\w*)\s+(\w+)/, async (msg, match) => {
      if (!this.isStarted || !match) return;
      const chatId = msg.chat.id;
      const amount = match[1];
      const token = match[2];
      const address = match[3];
      
      console.log(`Processing transfer command: ${amount} ${token} to ${address}`);
      this.processAction(chatId, `transfer ${amount} ${token} to ${address}`);
    });
    
    // Handle /help command
    this.bot.onText(/\/help/, (msg) => {
      if (!this.isStarted) return;
      const chatId = msg.chat.id;
      
      const helpText = `
# 🤖 SONICdeltaAIMASTER Help

This bot helps you manage your DeFi portfolio on Sonic Network with a focus on Delta Neutral strategies and yield optimization.

## 🔍 Getting Started
- Use the menu buttons to navigate through different features
- Type commands directly to perform specific actions
- Check your balances before executing strategies
- Monitor your positions regularly for optimal returns

## 📝 Command Format
Commands generally follow this format: \`/command <amount> <asset>\`
Example: \`/wrap 5\` to wrap 5 S tokens to wS

## 🔧 Need Further Help?
- Use \`/menu\` to see all available commands
- Visit our documentation at [docs.sonicnetwork.xyz]

For detailed guidance on any specific strategy or feature, just ask me directly!
      `;
      
      this.bot.sendMessage(chatId, helpText, { parse_mode: "Markdown" });
    });
  }
  
  private buildInlineKeyboard(menuOptions: MenuOptions): TelegramBot.InlineKeyboardButton[][] {
    return Object.values(menuOptions).map(row => row);
  }
  
  private async sendMainMenu(chatId: number) {
    await this.bot.editMessageText("📋 *Main Menu*\n\nPlease select an option:", {
      chat_id: chatId,
      message_id: this.activeMenus.get(chatId)?.messageId,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: this.buildInlineKeyboard(this.mainMenu)
      }
    });
  }
  
  private async sendMenu(chatId: number, title: string, menuOptions: MenuOptions) {
    await this.bot.editMessageText(`*${title}*\n\nPlease select an option:`, {
      chat_id: chatId,
      message_id: this.activeMenus.get(chatId)?.messageId,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: this.buildInlineKeyboard(menuOptions)
      }
    });
  }
  
  private async handleCallbackQuery(chatId: number, messageId: number, callbackData: string) {
    try {
      // Update active menu entry
      this.activeMenus.set(chatId, { messageId, menuContext: callbackData });

      if (callbackData === "menu_main") {
        await this.sendMainMenu(chatId);
        return;
      } else if (callbackData === "menu_defi_strategies") {
        await this.sendMenu(chatId, "DeFi Strategies", this.defiStrategiesMenu);
        return;
      } else if (callbackData === "menu_token_operations") {
        await this.sendMenu(chatId, "Token Operations", this.tokenOperationsMenu);
        return;
      } else if (callbackData === "menu_delta_strategy") {
        await this.sendMenu(chatId, "Delta Neutral Strategy", this.deltaStrategyMenu);
        return;
      } else if (callbackData === "menu_machfi") {
        await this.sendMenu(chatId, "MachFi", this.machfiMenu);
        return;
      } else if (callbackData === "menu_swapx") {
        await this.sendMenu(chatId, "SwapX DEX", this.swapXMenu);
        return;
      }

      // Main menu actions
      if (callbackData === "action_balance") {
        this.processAction(chatId, "check balances");
      } 
      else if (callbackData === "action_beefy") {
        this.processAction(chatId, "check portfolio");
      }
      else if (callbackData === "action_machfi") {
        this.processAction(chatId, "machfi-dashboard");
      }
      else if (callbackData === "action_delta_neutral") {
        // Show delta neutral menu
        await this.bot.editMessageText("📐 *Delta Neutral Strategies*\n\nChoose an option:", {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: this.buildInlineKeyboard(this.deltaStrategyMenu)
          }
        });
        this.activeMenus.set(chatId, { messageId, menuContext: "delta_neutral" });
      }
      else if (callbackData === "action_delta_neutral_apy") {
        this.processAction(chatId, "delta-neutral-apy");
      }
      else if (callbackData === "menu_defi_strategies") {
        // Show DeFi strategies menu
        await this.bot.editMessageText("📊 *DeFi Strategies*\n\nSelect a strategy:", {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: this.buildInlineKeyboard(this.defiStrategiesMenu)
          }
        });
        this.activeMenus.set(chatId, { messageId, menuContext: "defi_strategies" });
      }
      else if (callbackData === "menu_token_operations") {
        // Show token operations menu
        await this.bot.editMessageText("🔄 *Token Operations*\n\nSelect an operation:", {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: this.buildInlineKeyboard(this.tokenOperationsMenu)
          }
        });
        this.activeMenus.set(chatId, { messageId, menuContext: "token_operations" });
      }
      // Strategy actions
      else if (callbackData === "action_ws_strategy_info") {
        this.processAction(chatId, "ws-strategy info");
      }
      else if (callbackData === "action_usdc_strategy_info") {
        this.processAction(chatId, "usdc-strategy info");
      }
      // Token operation commands
      else if (callbackData === "command_wrap") {
        await this.bot.sendMessage(
          chatId,
          "🔄 *Wrap S tokens*\n\nUse the command format:\n`/wrap <amount>`\n\nExample: `/wrap 3`",
          { parse_mode: "Markdown" }
        );
      }
      else if (callbackData === "command_unwrap") {
        await this.bot.sendMessage(
          chatId,
          "🔄 *Unwrap wS tokens*\n\nUse the command format:\n`/unwrap <amount>`\n\nExample: `/unwrap 4`",
          { parse_mode: "Markdown" }
        );
      }
      else if (callbackData === "command_transfer") {
        await this.bot.sendMessage(
          chatId,
          "📤 *Transfer wS tokens*\n\nPlease provide the details in the format:\n`transfer <amount> wS to <address>`",
          { parse_mode: "Markdown" }
        );
      }
      else if (callbackData === "command_approve") {
        await this.bot.sendMessage(
          chatId,
          "✅ *Approve wS tokens*\n\nPlease provide the details in the format:\n`approve <amount> wS for <address>`",
          { parse_mode: "Markdown" }
        );
      }
      // MachFi actions
      else if (callbackData === "command_supply_collateral") {
        await this.bot.sendMessage(
          chatId,
          "💰 *Supply Collateral to MachFi*\n\nUse the command format:\n`/supplycollateral <amount> <asset>`\n\nSupported assets: S, USDC.e, WETH\n\nExample: `/supplycollateral 100 USDC.e`",
          { parse_mode: "Markdown" }
        );
      }
      else if (callbackData === "command_borrow") {
        await this.bot.sendMessage(
          chatId,
          "🏦 *Borrow Assets from MachFi*\n\nUse the command format:\n`/borrow <amount> <asset>`\n\nExample: `/borrow 10 S`",
          { parse_mode: "Markdown" }
        );
      }
      else if (callbackData === "command_repay") {
        await this.bot.sendMessage(
          chatId,
          "💸 *Repay Debt to MachFi*\n\nUse the command format:\n`/repay <amount> <asset>` or `/repay full <asset>` or `/repay all`\n\nExample: `/repay 5 S` or `/repay full S` or `/repay all`",
          { parse_mode: "Markdown" }
        );
      }
      else if (callbackData === "command_withdraw") {
        await this.bot.sendMessage(
          chatId,
          "📤 *Withdraw Collateral from MachFi*\n\nPlease provide the details in the format:\n`withdraw <amount> <asset> from machfi`",
          { parse_mode: "Markdown" }
        );
      }
      else if (callbackData === "command_execute_delta") {
        // Show dialog to input amount for delta neutral strategy
        await this.bot.sendMessage(
          chatId,
          "🚀 *Execute Delta Neutral Strategy*\n\nPlease enter the amount of USDC.e you want to use with the command:\n\n`/executemachfidelta <amount>`\n\nExample: `/executemachfidelta 100`\n\nNote: We recommend using MachFi strategy as Aave has reached its supply cap.",
          { parse_mode: "Markdown" }
        );
      }
      // Handle SwapX commands
      else if (callbackData === "command_swap_s_to_usdce") {
        await this.bot.sendMessage(chatId, "How much S would you like to swap to USDC.e? (e.g., 2.0)");
        this.pendingAction = { type: "swap_s_to_usdce" };
      } else if (callbackData === "command_swap_usdce_to_s") {
        await this.bot.sendMessage(chatId, "How much USDC.e would you like to swap to S? (e.g., 1.0)");
        this.pendingAction = { type: "swap_usdce_to_s" };
      }
    } catch (error) {
      console.error("Error processing callback query:", error);
      await this.bot.sendMessage(
        chatId,
        "I encountered an error processing your request. Please try again."
      );
    }
  }
  
  private async processAction(chatId: number, action: string) {
    try {
      this.bot.sendChatAction(chatId, 'typing');
      
      console.log(`Processing action: ${action}`);
      const response = await this.agent.invoke(action, this.config);
      
      // Split the response if it's too long
      if (response.length > 4000) {
        const chunks = this.splitMessage(response);
        for (const chunk of chunks) {
          await this.bot.sendMessage(chatId, chunk, { parse_mode: "Markdown" });
        }
      } else {
        await this.bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
      }
    } catch (error) {
      console.error("Error processing action:", error);
      await this.bot.sendMessage(
        chatId,
        "I encountered an error processing your request. Please try again."
      );
    }
  }

  private async handleMessage(msg: TelegramBot.Message) {
    if (!msg.text) return;
    
    const chatId = msg.chat.id;
    
    try {
      this.bot.sendChatAction(chatId, 'typing');
      
      // Handle pending actions
      if (this.pendingAction) {
        if (this.pendingAction.type === "swap_s_to_usdce") {
          // Handle S to USDC.e swap with input amount
          const amount = msg.text.trim();
          await this.processAction(chatId, `swapx-s-to-usdce ${amount}`);
          this.pendingAction = null;
          return;
        } else if (this.pendingAction.type === "swap_usdce_to_s") {
          // Handle USDC.e to S swap with input amount
          const amount = msg.text.trim();
          await this.processAction(chatId, `swapx-usdce-to-s ${amount}`);
          this.pendingAction = null;
          return;
        }
      }
      
      // Use invoke instead of stream
      const response = await this.agent.invoke(msg.text, this.config);
      
      // Split the response if it's too long
      if (response.length > 4000) {
        const chunks = this.splitMessage(response);
        for (const chunk of chunks) {
          await this.bot.sendMessage(chatId, chunk, { parse_mode: "Markdown" });
        }
      } else {
        await this.bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
      }
    } catch (error) {
      console.error("Error processing message:", error);
      await this.bot.sendMessage(
        chatId,
        "I encountered an error processing your request. Please try again."
      );
    }
  }
  
  private splitMessage(message: string, maxLength = 4000): string[] {
    const chunks: string[] = [];
    let currentChunk = "";
    
    const lines = message.split('\n');
    
    for (const line of lines) {
      if (currentChunk.length + line.length + 1 > maxLength) {
        chunks.push(currentChunk);
        currentChunk = line;
      } else {
        if (currentChunk) {
          currentChunk += '\n' + line;
        } else {
          currentChunk = line;
        }
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }

  private async handleDemoCommand(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const demoSteps = [
      {
        action: "check balances",
        description: "First, let's check our wallet balances"
      },
      {
        action: "wrap 1.0 S",
        description: "Now, let's wrap 1 S token to wS"
      },
      {
        action: "check balances",
        description: "Let's verify our wrapped tokens"
      },
      {
        action: "delta-neutral-apy",
        description: "Let's check the APY for the Delta Neutral strategy"
      },
      {
        action: "machfi-dashboard",
        description: "Let's check our MachFi dashboard"
      }
    ];
    
    await this.bot.sendMessage(chatId, "🎓 Starting demo mode! I'll walk you through some key features.");
    
    for (const [index, step] of demoSteps.entries()) {
      await this.bot.sendMessage(chatId, `*Step ${index + 1}*: ${step.description}`);
      await this.bot.sendChatAction(chatId, 'typing');
      
      const response = await this.agent.invoke(step.action, this.config);
      await this.bot.sendMessage(chatId, response);
      
      // Wait between steps unless it's the last one
      if (index < demoSteps.length - 1) {
        await this.bot.sendMessage(chatId, "Continuing to next step in 3 seconds...");
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    await this.bot.sendMessage(
      chatId, 
      "🎉 Demo completed! You've seen the basic features. Feel free to explore more using the /menu command."
    );
  }

  private async handleMenuCommand(chatId: number) {
    // Create a rich menu message with markdown and copyable commands
    const menuMsg = `# 🤖 deFΔI Menu

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

    // Send the menu message with markdown formatting only
    // No inline keyboard so users can easily copy and paste commands
    await this.bot.sendMessage(chatId, menuMsg, { 
      parse_mode: "Markdown",
      disable_web_page_preview: true 
    });
  }

  /**
   * Sets the menu button for the bot to provide quick access to commands
   */
  private async setMenuButton(chatId: number) {
    try {
      // Set menu button to show commands
      await this.bot.setChatMenuButton({
        chat_id: chatId,
        menu_button: {
          type: "commands"  // This will show a menu of commands
        }
      });
      
      // Set commands that will appear in the menu
      await this.bot.setMyCommands([
        { command: 'menu', description: 'Show main menu of commands' },
        { command: 'balance', description: 'Check wallet and portfolio balances' },
        { command: 'deltaapy', description: 'Check delta neutral strategy APYs' },
        { command: 'machfi', description: 'View MachFi lending dashboard' },
        { command: 'wrap', description: 'Wrap S tokens to wS (add amount)' },
        { command: 'unwrap', description: 'Unwrap wS tokens to S (add amount)' },
        { command: 'help', description: 'Get help with using the bot' }
      ]);
      
      console.log(`Menu button set for chat ${chatId}`);
    } catch (error) {
      console.error("Error setting menu button:", error);
    }
  }
}
