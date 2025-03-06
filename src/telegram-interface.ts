import TelegramBot from "node-telegram-bot-api";
import { HumanMessage } from "@langchain/core/messages";

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
        "Hello! I am your AI assistant. How can I help you today?\nUse /exit to return to terminal, /kill to shut down the application, or /menu to see available strategies.",
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
          `
# 🚀 DeFi Strategies Menu

## 1. 🔥 wS-SwapX-Beefy Strategy (APY ~500%)
- 💬 **Command**: Execute full wS swapx beefy strategy with <amount> wS
- 🔍 **Example**: Execute full wS swapx beefy strategy with 1.5 wS
- 📋 **Description**: Deposit wS tokens into SwapX vault, receive LP tokens, then deposit to Beefy for high yield.

## 2. 💰 USDC.e-SwapX-Beefy Strategy (APY ~250%)
- 💬 **Command**: Execute USDC.e strategy with <amount> USDC.e
- 🔍 **Example**: Execute USDC.e strategy with 2.5 USDC.e
- 📋 **Description**: Deposit USDC.e into SwapX vault, receive LP tokens, then deposit to Beefy.

## 3. ⚖️ Delta Neutral Strategy (APY ~523%)
- 💬 **Commands**: 
  - 📊 Check APY: delta-neutral-apy
  - 🚀 Execute: execute-delta-neutral with <amount> USDC.e
- 🔍 **Example**: execute-delta-neutral with 5.0 USDC.e
- 📋 **Description**: Use USDC.e as collateral in Aave, borrow 50% in wS, deploy to SwapX-Beefy.

## 🛠️ Utility Commands
- 👛 Check wallet balances: check wallet balances
- 🐮 Check Beefy portfolio: check beefy portfolio
- 🏦 Check Aave dashboard: aave dashboard
- 🔄 Wrap/Unwrap: wrap 1.0 S to wS or unwrap 1.0 wS to S
- 📊 Portfolio analysis: analyze portfolio strategies

## 📱 Bot Commands
- 🔄 /start - Start the bot
- 📋 /menu - Show this menu
- 🎮 /demo - Run an automated demo
- 🚪 /exit - Return to terminal
- 🛑 /kill - Shut down the application

You can also use /demo to see a demonstration of these features.
          `,
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
      
      // Use invoke instead of stream
      const response = await this.agent.invoke(msg.text, this.config);
      
      // Send the response directly since we're not streaming
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
        action: "wrap 1.0 S",
        description: "Now, let's wrap 1 S token to wS"
      },
      {
        action: "check balance",
        description: "Let's verify our wrapped tokens"
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

    await this.bot.sendMessage(chatId, "Starting Demo Mode...\n" +
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

    await this.bot.sendMessage(chatId, "\nDemo completed! You can now try these actions yourself.");
  }
}
