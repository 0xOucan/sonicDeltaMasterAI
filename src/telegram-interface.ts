/**
 * Simplified Telegram interface for the Sonic DeFI Agent
 * 
 * This implementation focuses on direct text commands and removes all complex UI elements
 * to improve reliability and simplify interaction. The bot responds to direct commands
 * and passes all messages to the agent's invoke method for processing.
 */

import TelegramBot from "node-telegram-bot-api";

interface TelegramInterfaceOptions {
  onExit: () => void;
  onKill: () => void;
}

export class TelegramInterface {
  private bot: TelegramBot;
  private agent: any;
  private config: any;
  private options: TelegramInterfaceOptions;
  private isStarted: boolean = false;

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
      this.bot.sendMessage(
        chatId,
        "👋 Hello! I am your AI assistant. How can I help you today?\n" +
        "Use /exit to return to terminal, /kill to shut down the application, or /menu to see available commands."
      );
    });

    // Handle /exit command
    this.bot.onText(/\/exit/, async (msg) => {
      const chatId = msg.chat.id;
      if (this.isStarted) {
        await this.bot.sendMessage(chatId, "Goodbye! Returning to terminal...");
        console.log("Telegram session ended. Returning to terminal...");
        this.bot.stopPolling();
        this.options.onExit();
      }
    });

    // Handle /kill command
    this.bot.onText(/\/kill/, async (msg) => {
      const chatId = msg.chat.id;
      if (this.isStarted) {
        await this.bot.sendMessage(chatId, "Shutting down the application...");
        console.log("Kill command received. Shutting down...");
        this.bot.stopPolling();
        this.options.onKill();
      }
    });

    // Handle /menu command
    this.bot.onText(/\/menu/, async (msg) => {
      const chatId = msg.chat.id;
      if (this.isStarted) {
        await this.bot.sendMessage(
          chatId,
          `# 🤖 AI Agent Capabilities & Commands

## 💰 Portfolio Management
- \`check wallet balances\` - View all token balances and portfolio value
- \`check beefy portfolio\` - View Beefy vault positions and APYs
- \`aave dashboard\` - View Aave lending positions and metrics
- \`machfi-dashboard\` - View MachFi lending positions and metrics

## 🏦 Lending Operations
### Aave
- \`aave-supply-usdce <amount>\` - Supply USDC.e to Aave
- \`aave-supply-weth <amount>\` - Supply WETH to Aave
- \`aave-withdraw-usdce <amount>\` - Withdraw USDC.e from Aave
- \`aave-withdraw-weth <amount>\` - Withdraw WETH from Aave

### MachFi
- \`machfi-supply-usdce <amount>\` - Supply USDC.e to MachFi
- \`machfi-supply-s <amount>\` - Supply native S to MachFi
- \`machfi-borrow <asset> <amount>\` - Borrow from MachFi
- \`machfi-repay <asset> <amount>\` - Repay borrowed assets
- \`machfi-withdraw <asset> <amount>\` - Withdraw supplied assets

## 🔄 Token Operations
- \`wrap <amount>\` - Wrap S tokens to wS
- \`unwrap <amount>\` - Unwrap wS back to S tokens
- \`transfer <token> <amount> <address>\` - Transfer tokens
- \`approve <token> <amount> <spender>\` - Approve token spending

## 💱 SwapX DEX
- \`swapx-s-to-usdce <amount>\` - Swap native S to USDC.e
- \`swapx-usdce-to-s <amount>\` - Swap USDC.e to native S
- \`swapx-swap tokenIn=<TOKEN> tokenOut=<TOKEN> amount=<AMOUNT>\` - Generic swap

## 🚀 DeFi Strategies

### 1. 🌊 wS-SwapX-Beefy Strategy (APY ~500%)
- \`execute full wS swapx beefy strategy with <amount> wS\`
- Example: execute full wS swapx beefy strategy with 1.5 wS

### 2. 💵 USDC.e-SwapX-Beefy Strategy
- \`execute usdce strategy with <amount> USDC.e\`
- Example: execute usdce strategy with 2.5 USDC.e

### 3. ⚖️ Delta Neutral Strategy
- \`delta-neutral-apy\` - Check current APY
- \`execute-delta-neutral with <amount> USDC.e\`
- Example: execute-delta-neutral with 5.0 USDC.e

## 🛠️ Utility Commands
- \`/demo\` - Watch guided demo of features
- \`/menu\` - Show this menu
- \`/exit\` - Return to terminal
- \`/kill\` - Shutdown application

💡 Tip: You can check your balances before executing any strategy.`,
          { parse_mode: 'Markdown' }
        );
      }
    });

    // Handle /demo command
    this.bot.onText(/\/demo/, (msg) => this.handleDemoCommand(msg));

    // Handle all other messages
    this.bot.on("message", async (msg) => {
      if (msg.text && !msg.text.startsWith("/") && this.isStarted) {
        this.handleMessage(msg);
      }
    });
  }

  private async handleMessage(msg: TelegramBot.Message) {
    if (!msg.text) return;
    
    const chatId = msg.chat.id;
    
    try {
      this.bot.sendChatAction(chatId, 'typing');
      
      console.log(`Processing message: "${msg.text}"`);
      
      // Use invoke instead of stream
      const response = await this.agent.invoke(msg.text, this.config);
      
      // Send the response directly
      await this.bot.sendMessage(chatId, response);
    } catch (error) {
      console.error("Error processing message:", error);
      await this.bot.sendMessage(
        chatId,
        "I encountered an error processing your request. Please try again."
      );
    }
  }

  private async handleDemoCommand(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const demoSteps = [
      {
        action: "check balance",
        description: "First, let's check our wallet balances"
      },
      {
        action: "wrap 1.0",
        description: "Now, let's wrap 1 S token to wS"
      },
      {
        action: "check balance",
        description: "Let's verify our wrapped tokens"
      },
      {
        action: "swapx-s-to-usdce 0.1",
        description: "Let's swap some S tokens for USDC.e using SwapX DEX"
      },
      {
        action: "check balance",
        description: "Let's verify our USDC.e balance after the swap"
      },
      {
        action: "delta-neutral-apy",
        description: "Let's check the APY for the Delta Neutral strategy"
      },
      {
        action: "execute full wS swapx beefy strategy with 1.0 wS",
        description: "Let's deposit our wS tokens into the SwapX Beefy strategy"
      },
      {
        action: "check balance",
        description: "Finally, let's check our updated balances"
      }
    ];

    await this.bot.sendMessage(chatId, "🎓 Starting Demo Mode...\n" +
      "This demo will showcase the main features of the Sonic DeFi Agent");

    for (const step of demoSteps) {
      await this.bot.sendMessage(chatId, `\nDemo Step: ${step.description}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await this.bot.sendMessage(chatId, `Executing: ${step.action}`);
      
      try {
        const response = await this.agent.invoke(step.action);
        await this.bot.sendMessage(chatId, response);
      } catch (error) {
        await this.bot.sendMessage(chatId, `Error in demo step: ${error}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    await this.bot.sendMessage(chatId, "\n✨ Demo completed! You can now try these actions yourself.");
  }
}
