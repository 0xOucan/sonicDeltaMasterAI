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
import { usdceSwapXBeefyActionProvider } from "./action-providers/usdce-swapx-beefy";
import { AaveSupplyActionProvider } from "./action-providers/aave-supply";
import { BeefyPortfolioActionProvider } from "./action-providers/beefy-portfolio";
import { deltaNeutralActionProvider } from "./action-providers/delta-neutral";
import { MachFiActionProvider } from "./action-providers/machfi/machfiActionProvider";
import { SwapXActionProvider } from "./action-providers/swapx";

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

    // Create action providers array with all strategies
    const actionProviders = [
      strategyManagerActionProvider(),
      sWrapperActionProvider(),
      wsSwapXBeefyActionProvider(),
      new BalanceCheckerActionProvider(),
      usdceSwapXBeefyActionProvider(),
      new AaveSupplyActionProvider(),
      new BeefyPortfolioActionProvider(),
      new MachFiActionProvider(),
      deltaNeutralActionProvider(),
      new SwapXActionProvider(),
    ] as ActionProvider<WalletProvider>[];

    // Initialize LLM
    const llm = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0,
      streaming: true,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    console.log("LLM initialized");

    const agentkit = await AgentKit.from({
      walletProvider,
      actionProviders: actionProviders,
    });

    const tools = await getLangChainTools(agentkit);
    const memorySaver = new MemorySaver();
    const agentConfig = {
      configurable: { thread_id: "Sonic-Blockchain-Chatbot" }
    };

    const reactAgent = await createReactAgent({
      llm,
      tools,
      checkpointSaver: memorySaver,
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
        
        DeFi Strategy Features:
        - Execute wS-SwapX-Beefy strategy
        - Execute USDC.e-SwapX-Beefy strategy
        - Execute Delta Neutral strategy (USDC.e collateral, borrow wS, deploy to Beefy)
        - Check APY for Delta Neutral strategy
        
        MachFi Lending Features:
        - Supply USDC.e and native S to MachFi
        - Borrow USDC.e and S from MachFi
        - Repay borrowed assets
        - Withdraw supplied assets
        - View MachFi lending dashboard
        
        Get the wallet details first to see what tokens are available.
      `,
    });

    return { 
      agent: {
        invoke: async (input: string, config?: AgentConfig): Promise<string> => {
          console.log("🔍 Agent received command:", input);
          
          try {
            // Direct command handling for common patterns
            const trimmedInput = input.trim().toLowerCase();
            
            // Handle wrap command
            if (trimmedInput.startsWith('wrap ')) {
              console.log(`🔄 Direct wrap command detected: ${input}`);
              const match = input.match(/wrap\s+(\d+\.?\d*)/i);
              if (match && match[1]) {
                const amount = match[1];
                
                // Format as a clear instruction for the LLM
                const formattedCommand = `Wrap ${amount} S tokens to wS tokens. Execute the wrap-s action with the amount parameter set to ${amount}.`;
                console.log(`💬 Reformatting to: ${formattedCommand}`);
                
                const result = await reactAgent.invoke(
                  { messages: [new HumanMessage(formattedCommand)] },
                  config || agentConfig
                );
                
                console.log("✅ Wrap command completed");
                return result.messages[result.messages.length - 1].content as string;
              }
            }
            
            // Handle unwrap command
            if (trimmedInput.startsWith('unwrap ')) {
              console.log(`🔄 Direct unwrap command detected: ${input}`);
              const match = input.match(/unwrap\s+(\d+\.?\d*)/i);
              if (match && match[1]) {
                const amount = match[1];
                
                // Format as a clear instruction for the LLM
                const formattedCommand = `Unwrap ${amount} wS tokens to S tokens. Execute the unwrap-ws action with the amount parameter set to ${amount}.`;
                console.log(`💬 Reformatting to: ${formattedCommand}`);
                
                const result = await reactAgent.invoke(
                  { messages: [new HumanMessage(formattedCommand)] },
                  config || agentConfig
                );
                
                console.log("✅ Unwrap command completed");
                return result.messages[result.messages.length - 1].content as string;
              }
            }
            
            // Handle transfer command
            if (trimmedInput.startsWith('transfer ')) {
              console.log(`💸 Direct transfer command detected: ${input}`);
              const match = input.match(/transfer\s+(\w+)\s+(\d+\.?\d*)\s+(0x[a-fA-F0-9]{40})/i);
              if (match && match[1] && match[2] && match[3]) {
                const token = match[1];
                const amount = match[2];
                const address = match[3];
                
                // Format as a clear instruction for the LLM
                const formattedCommand = `Transfer ${amount} ${token} tokens to address ${address}.`;
                console.log(`💬 Reformatting to: ${formattedCommand}`);
                
                const result = await reactAgent.invoke(
                  { messages: [new HumanMessage(formattedCommand)] },
                  config || agentConfig
                );
                
                console.log("✅ Transfer command completed");
                return result.messages[result.messages.length - 1].content as string;
              }
            }
            
            // Handle supplycollateral command for MachFi
            if (trimmedInput.startsWith('supplycollateral ')) {
              console.log(`💰 Direct supplycollateral command detected: ${input}`);
              const match = input.match(/supplycollateral\s+(\d+\.?\d*)\s+(\w+)/i);
              if (match && match[1] && match[2]) {
                const amount = match[1];
                const asset = match[2];
                
                // Format as a clear instruction for the LLM
                const formattedCommand = `Supply ${amount} ${asset} as collateral to MachFi. Execute the machfi-supply-collateral action with amount=${amount} and asset=${asset}.`;
                console.log(`💬 Reformatting to: ${formattedCommand}`);
                
                const result = await reactAgent.invoke(
                  { messages: [new HumanMessage(formattedCommand)] },
                  config || agentConfig
                );
                
                console.log("✅ SupplyCollateral command completed");
                return result.messages[result.messages.length - 1].content as string;
              }
            }
            
            // Handle borrow command for MachFi
            if (trimmedInput.startsWith('borrow ')) {
              console.log(`🏦 Direct borrow command detected: ${input}`);
              const match = input.match(/borrow\s+(\d+\.?\d*)\s+(\w+)/i);
              if (match && match[1] && match[2]) {
                const amount = match[1];
                const asset = match[2];
                
                // Format as a clear instruction for the LLM
                const formattedCommand = `Borrow ${amount} ${asset} from MachFi. Execute the machfi-borrow action with amount=${amount} and asset=${asset}.`;
                console.log(`💬 Reformatting to: ${formattedCommand}`);
                
                const result = await reactAgent.invoke(
                  { messages: [new HumanMessage(formattedCommand)] },
                  config || agentConfig
                );
                
                console.log("✅ Borrow command completed");
                return result.messages[result.messages.length - 1].content as string;
              }
            }
            
            // Handle repay command for MachFi
            if (trimmedInput.startsWith('repay ')) {
              console.log(`💸 Direct repay command detected: ${input}`);
              const match = input.match(/repay\s+(\d+\.?\d*)\s+(\w+)/i);
              if (match && match[1] && match[2]) {
                const amount = match[1];
                const asset = match[2];
                
                // Format as a clear instruction for the LLM
                const formattedCommand = `Repay ${amount} ${asset} to MachFi. Execute the machfi-repay action with amount=${amount} and asset=${asset}.`;
                console.log(`💬 Reformatting to: ${formattedCommand}`);
                
                const result = await reactAgent.invoke(
                  { messages: [new HumanMessage(formattedCommand)] },
                  config || agentConfig
                );
                
                console.log("✅ Repay command completed");
                return result.messages[result.messages.length - 1].content as string;
              }
            }
            
            // Handle delta-neutral-apy command
            if (trimmedInput === 'delta-neutral-apy') {
              console.log(`📊 Delta neutral APY check command detected`);
              
              const formattedCommand = `Show the current APY for delta neutral strategies. Execute the delta-neutral-apy action.`;
              console.log(`💬 Reformatting to: ${formattedCommand}`);
              
              const result = await reactAgent.invoke(
                { messages: [new HumanMessage(formattedCommand)] },
                config || agentConfig
              );
              
              console.log("✅ Delta neutral APY check completed");
              return result.messages[result.messages.length - 1].content as string;
            }
            
            // Handle swapx-s-to-usdce command
            if (trimmedInput.startsWith('swapx-s-to-usdce ')) {
              console.log(`💱 SwapX S to USDC.e command detected: ${input}`);
              const match = input.match(/swapx-s-to-usdce\s+(\d+\.?\d*)/i);
              if (match && match[1]) {
                const amount = match[1];
                
                // Format as a clear instruction for the LLM
                const formattedCommand = `Swap ${amount} S tokens to USDC.e using SwapX. Execute the swapx-s-to-usdce action with amount=${amount}.`;
                console.log(`💬 Reformatting to: ${formattedCommand}`);
                
                const result = await reactAgent.invoke(
                  { messages: [new HumanMessage(formattedCommand)] },
                  config || agentConfig
                );
                
                console.log("✅ SwapX S to USDC.e completed");
                return result.messages[result.messages.length - 1].content as string;
              }
            }
            
            // Handle swapx-usdce-to-s command
            if (trimmedInput.startsWith('swapx-usdce-to-s ')) {
              console.log(`💱 SwapX USDC.e to S command detected: ${input}`);
              const match = input.match(/swapx-usdce-to-s\s+(\d+\.?\d*)/i);
              if (match && match[1]) {
                const amount = match[1];
                
                // Format as a clear instruction for the LLM
                const formattedCommand = `Swap ${amount} USDC.e to S tokens using SwapX. Execute the swapx-usdce-to-s action with amount=${amount}.`;
                console.log(`💬 Reformatting to: ${formattedCommand}`);
                
                const result = await reactAgent.invoke(
                  { messages: [new HumanMessage(formattedCommand)] },
                  config || agentConfig
                );
                
                console.log("✅ SwapX USDC.e to S completed");
                return result.messages[result.messages.length - 1].content as string;
              }
            }
            
            // Handle generic swapx-swap command
            if (trimmedInput.startsWith('swapx-swap ')) {
              console.log(`💱 Generic SwapX command detected: ${input}`);
              const tokenInMatch = input.match(/tokenin=(\w+)/i);
              const tokenOutMatch = input.match(/tokenout=(\w+)/i);
              const amountMatch = input.match(/amount=(\d+\.?\d*)/i);
              
              if (tokenInMatch && tokenOutMatch && amountMatch) {
                const tokenIn = tokenInMatch[1];
                const tokenOut = tokenOutMatch[1];
                const amount = amountMatch[1];
                
                // Format as a clear instruction for the LLM
                const formattedCommand = `Swap ${amount} ${tokenIn} to ${tokenOut} using SwapX. Execute the swapx-swap action with tokenIn=${tokenIn}, tokenOut=${tokenOut}, amount=${amount}.`;
                console.log(`💬 Reformatting to: ${formattedCommand}`);
                
                const result = await reactAgent.invoke(
                  { messages: [new HumanMessage(formattedCommand)] },
                  config || agentConfig
                );
                
                console.log("✅ Generic SwapX swap completed");
                return result.messages[result.messages.length - 1].content as string;
              }
            }
            
            // Let the agent process normally
            console.log("💬 Sending to LLM for processing:", input);
            const result = await reactAgent.invoke(
              { messages: [new HumanMessage(input)] },
              config || agentConfig
            );
            console.log("✅ Agent completed processing");
            return result.messages[result.messages.length - 1].content as string;
          } catch (error) {
            console.error("❌ Error in agent invoke:", error);
            if (error instanceof Error) {
              return `Error executing command: ${error.message}`;
            }
            return "An unknown error occurred while processing your request.";
          }
        },
        walletProvider,
        actionProviders: actionProviders,
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

      // Handle special menu command to show available strategies
      if (userInput.toLowerCase() === "menu") {
        console.log(`
Here is the menu of available DeFi strategies:

### 1. wS-SwapX-Beefy Strategy
- **Command**: Execute full wS swapx beefy strategy with <amount> wS
- **Example**: Execute full wS swapx beefy strategy with 1.5 wS
- **Description**: Deposit wS tokens into the SwapX vault, receive SwapX LP tokens, and then deposit those LP tokens into the Beefy vault for yield.

### 2. USDC.e-SwapX-Beefy Strategy
- **Command**: Execute USDC.e strategy with <amount> USDC.e
- **Example**: Execute USDC.e strategy with 2.5 USDC.e
- **Description**: Deposit USDC.e tokens into the SwapX vault, receive SwapX LP tokens, and then deposit those LP tokens into the Beefy vault for yield.

### 3. Delta Neutral Strategy
- **Commands**: 
  - Check APY: delta-neutral-apy
  - Execute: execute-delta-neutral with <amount> USDC.e
- **Example**: execute-delta-neutral with 5.0 USDC.e
- **Description**: A delta-neutral strategy that uses USDC.e as collateral in Aave, borrows 50% of the collateral value in wS tokens, and deploys them to the SwapX-Beefy vault.

You can also check your wallet balance with the command "check wallet balances".
        `);
        continue;
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

  // Use the TelegramInterface class directly
  const telegramInterface = new TelegramInterface(
    agent,
    config,
    {
      onExit: () => {
        // Signal the process to exit by emitting SIGINT
        process.emit('SIGINT', 'SIGINT');
      },
      onKill: () => {
        // Force exit with 0 status code
        setTimeout(() => process.exit(0), 500);
      }
    }
  );

  // This will keep the process running until the bot is stopped
  return new Promise<void>((resolve) => {
    // Set up a listener for SIGINT signal that can be triggered from the bot
    process.once('SIGINT', () => {
      console.log("Exiting Telegram mode...");
      resolve();
    });

    // Set up a listener for uncaughtException to handle any bot errors
    process.on('uncaughtException', (error) => {
      console.error("Uncaught exception in Telegram bot:", error);
      resolve();
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
  console.log("\n🎓 Starting Demo Mode...");
  console.log("This demo will showcase the main features of the Sonic DeFi Agent");
  console.log("⌨️ Press Enter to start the demo...");
  
  const demoConfig = {
    configurable: { thread_id: "demo-session" }
  };
  
  await new Promise(resolve => readline.createInterface(process.stdin).question("", resolve));

  const demoSteps = [
    {
      action: "check balance",
      description: "💰 First, let's check our wallet balances"
    },
    {
      action: "wrap 1.0 S",
      description: "🔄 Now, let's wrap 1 S token to wS"
    },
    {
      action: "check balance",
      description: "🔍 Let's verify our wrapped tokens"
    },
    {
      action: "delta-neutral-apy",
      description: "📊 Let's check the APY for the Delta Neutral strategy"
    },
    {
      action: "execute full wS swapx beefy strategy with 1.0 wS",
      description: "🚀 Let's deposit our wS tokens into the SwapX Beefy strategy"
    },
    {
      action: "check balance",
      description: "💎 Finally, let's check our updated balances"
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

  console.log("\n✨ Demo completed! You can now try these actions yourself.");
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
