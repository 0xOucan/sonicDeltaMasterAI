import {
  AgentKit,
  ActionProvider,
  Network,
  ViemWalletProvider as WalletProvider,
} from "@coinbase/agentkit";

import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as readline from "readline";
import { TelegramInterface } from "./telegram-interface";
import "reflect-metadata";
import { createPublicClient, http } from 'viem';
import { sonic } from 'viem/chains';
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient } from "viem";
import { strategyManagerActionProvider } from "./action-providers/strategy-manager";
import { sWrapperActionProvider } from "./action-providers/swrapper";
import { wsSwapXBeefyActionProvider } from "./action-providers/wsswapx-beefy";
import { BalanceCheckerActionProvider } from "./action-providers/balance-checker";

dotenv.config();

/**
 * Validates that required environment variables are set
 *
 * @throws {Error} - If required environment variables are missing
 * @returns {void}
 */
function validateEnvironment(): void {
  const missingVars: string[] = [];

  const requiredVars = [
    "OPENAI_API_KEY",
    "WALLET_PRIVATE_KEY"
  ];
  
  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.error("Error: Required environment variables are not set");
    missingVars.forEach((varName) => {
      console.error(`${varName}=your_${varName.toLowerCase()}_here`);
    });
    process.exit(1);
  }

  console.log("Environment validated successfully");
}

// Add this right after imports and before any other code
validateEnvironment();

console.log("Environment validated successfully");

// Add these types
type Agent = {
  invoke: (input: string, config?: AgentConfig) => Promise<string>;
  walletProvider: WalletProvider;
  actionProviders: ActionProvider<WalletProvider>[];
  getActions: () => any[];
};

type AgentConfig = {
  configurable: { thread_id: string };
};

/**
 * Initialize the agent with AgentKit
 *
 * @returns Agent executor and config
 */
async function initializeAgent(): Promise<{ agent: Agent; config: AgentConfig }> {
  try {
    console.log("Initializing agent...");

    const privateKey = process.env.WALLET_PRIVATE_KEY;

    if (!privateKey) {
      throw new Error("Wallet private key not found in environment variables");
    }

    // Use Sonic chain
    const selectedChain = sonic;
    console.log(`Using Sonic blockchain - Chain ID: ${selectedChain.id}`);

    // Create Viem account and client
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    
    const transport = http(selectedChain.rpcUrls.default.http[0], {
      batch: true,
      fetchOptions: {},
      retryCount: 3,
      retryDelay: 100,
      timeout: 30_000,
    });

    const client = createWalletClient({
      account,
      chain: selectedChain,
      transport,
    });

    // Create Viem wallet provider
    const walletProvider = new WalletProvider(client);

    // Initialize LLM
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0,
    });

    console.log("LLM initialized");

    // Initialize AgentKit with basic action providers
    const providers = [
      strategyManagerActionProvider(),
      sWrapperActionProvider(),
      wsSwapXBeefyActionProvider(),
      new BalanceCheckerActionProvider(),
    ];

    const agentkit = await AgentKit.from({
      walletProvider,
      actionProviders: providers,
    });

    const tools = await getLangChainTools(agentkit);
    const memory = new MemorySaver();
    const agentConfig = {
      configurable: { thread_id: "Sonic-Blockchain-Chatbot" }
    };

    const reactAgent = await createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      messageModifier: `
        You are a helpful agent that can interact onchain using the Coinbase Developer Platform AgentKit.
        You are empowered to interact onchain using your tools.
        
        Current Network: Sonic Blockchain (Chain ID: 146)
        
        Available Features:
        - Check wallet balances and network status
        - Transfer tokens
        - Interact with basic ERC20 functionality
        - Wrap and unwrap S (Sonic) tokens to wS tokens
        - Check S, wS and USDC.e balances in your connected wallet
        
        S Token Wrapping Features:
        - Wrap native S tokens to wS tokens
        - Unwrap wS tokens back to native S tokens
        - Transfer wS tokens
        - Check S and wS balances
        
        Get the wallet details first to see what tokens are available.
      `,
    });

    return { 
      agent: {
        invoke: async (input: string, config?: AgentConfig) => {
          const result = await reactAgent.invoke(
            { messages: [new HumanMessage(input)] },
            config || agentConfig
          );
          return result.messages[result.messages.length - 1].content as string;
        },
        walletProvider,
        actionProviders: providers,
        getActions: () => tools
      },
      config: agentConfig 
    };
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw error;
  }
}

/**
 * Run the agent autonomously with specified intervals
 */
async function runAutonomousMode(agent: Agent, config: AgentConfig, interval = 10) {
  console.log("Starting autonomous mode...");

  while (true) {
    try {
      const thought =
        "Be creative and do something interesting on the blockchain. " +
        "Choose an action or set of actions and execute it that highlights your abilities.";

      const stream = await agent.invoke(thought);
      console.log(stream);

      await new Promise((resolve) => setTimeout(resolve, interval * 1000));
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error:", error.message);
      }
      process.exit(1);
    }
  }
}

/**
 * Run the agent interactively based on user input
 */
async function runChatMode(agent: Agent, config: AgentConfig) {
  console.log("Starting chat mode... Type 'exit' to end.");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  try {
    while (true) {
      const userInput = await question("\nPrompt: ");

      if (userInput.toLowerCase() === "exit") {
        break;
      }

      const response = await agent.invoke(userInput, config);
      console.log(response);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

/**
 * Run the Telegram interface mode
 */
async function runTelegramMode(agent: Agent, config: AgentConfig) {
  console.log("Starting Telegram mode... Waiting for /start command");

  return new Promise<void>((resolve) => {
    const telegram = new TelegramInterface(agent, config, {
      onExit: () => {
        console.log("Exiting Telegram mode...");
        resolve();
      },
      onKill: () => {
        console.log("Kill command received. Shutting down...");
        process.exit(0);
      },
    });
  });
}

async function simulateUserTyping(text: string, delay = 50): Promise<void> {
  process.stdout.write("\nPrompt: ");
  for (const char of text) {
    process.stdout.write(char);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  process.stdout.write("\n\n");
}

async function demoMode(agent: Agent) {
  console.log("\nStarting Demo Mode...");
  console.log("This demo will showcase the main features of the Sonic DeFi Agent");
  console.log("Press Enter to start the demo...");
  
  const demoConfig = {
    configurable: { thread_id: "demo-session" }
  };
  
  await new Promise(resolve => readline.createInterface(process.stdin).question("", resolve));

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
      action: "execute full wS swapx beefy strategy with 1.0 wS",
      description: "Let's deposit our wS tokens into the SwapX Beefy strategy",
      delay: 10000 // Longer delay for complex transaction
    },
    {
      action: "check balance",
      description: "Finally, let's check our updated balances"
    }
  ];

  for (const step of demoSteps) {
    console.log("\n-------------------");
    console.log(`\nDemo Step: ${step.description}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await simulateUserTyping(step.action);
    
    try {
      const response = await agent.invoke(step.action, demoConfig);
      console.log("-------------------");
      console.log(response);
    } catch (error) {
      console.error("Error in demo step:", error);
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log("\nDemo completed! You can now try these actions yourself.");
  process.exit(0);
}

/**
 * Main entry point
 */
async function main() {
  try {
    console.log("Starting initialization...");
    const { agent, config } = await initializeAgent();
    console.log("Agent initialized successfully");

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log("\nAvailable modes:");
    console.log("1. chat      - Interactive chat mode");
    console.log("2. telegram  - Telegram bot mode");
    console.log("3. auto      - Autonomous action mode");
    console.log("4. demo      - Demo mode with preset actions");

    const mode = await new Promise<string>(resolve => {
      rl.question("\nChoose a mode (enter number or name): ", resolve);
    });

    rl.close();

    switch (mode.toLowerCase()) {
      case "1":
      case "chat":
        console.log("Selected mode: chat");
        await runChatMode(agent, config);
        break;
      case "2":
      case "telegram":
        console.log("Selected mode: telegram");
        await runTelegramMode(agent, config);
        break;
      case "3":
      case "auto":
        console.log("Selected mode: auto");
        await runAutonomousMode(agent, config);
        break;
      case "4":
      case "demo":
        console.log("Selected mode: demo");
        await demoMode(agent);
        break;
      default:
        console.log("Invalid mode selected");
        process.exit(1);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Fatal error:", error.message);
    }
    process.exit(1);
  }
}

main();
