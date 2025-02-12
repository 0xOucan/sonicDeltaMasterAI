import {
  AgentKit,
  CdpWalletProvider,
  wethActionProvider,
  walletActionProvider,
  erc20ActionProvider,
  cdpApiActionProvider,
  cdpWalletActionProvider,
  pythActionProvider,
  Network,
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
import {
  xocolatlActionProvider,
} from "./action-providers/xocolatl";
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { bobcProtocolActionProvider } from "./action-providers/bobc-protocol";

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
    "CDP_API_KEY_NAME",
    "CDP_API_KEY_PRIVATE_KEY",
    "NETWORK_ID",
    "NETWORK_ID_2"  // Add NETWORK_ID_2 as required
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

  // Validate network IDs
  const validNetworks = {
    NETWORK_ID: ["base-sepolia"],
    NETWORK_ID_2: ["base"]
  };

  if (!validNetworks.NETWORK_ID.includes(process.env.NETWORK_ID!)) {
    console.error(`Error: NETWORK_ID must be: base-sepolia`);
    process.exit(1);
  }

  if (!validNetworks.NETWORK_ID_2.includes(process.env.NETWORK_ID_2!)) {
    console.error(`Error: NETWORK_ID_2 must be: base`);
    process.exit(1);
  }

  console.log("Environment validated successfully");
  console.log(`Primary Network (Testnet): ${process.env.NETWORK_ID}`);
  console.log(`Secondary Network (Mainnet): ${process.env.NETWORK_ID_2}`);
}

// Add this right after imports and before any other code
validateEnvironment();

// Add this right after the validateEnvironment() call
console.log("Environment validated successfully");
console.log("Network ID:", process.env.NETWORK_ID || "base-sepolia");

// Configure a file to persist the agent's CDP MPC Wallet Data
const WALLET_DATA_FILE = "wallet_data.txt";

async function selectNetwork(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\nSelect network:");
  console.log("1. Base Sepolia (Testnet)");
  console.log("2. Base (Mainnet)");

  const answer = await new Promise<string>((resolve) => {
    rl.question("Enter your choice (1 or 2): ", resolve);
  });
  
  rl.close();

  switch (answer.trim()) {
    case "1":
      return process.env.NETWORK_ID || "base-sepolia";
    case "2":
      return process.env.NETWORK_ID_2 || "base";
    default:
      console.log("Invalid choice, defaulting to Base Sepolia");
      return process.env.NETWORK_ID || "base-sepolia";
  }
}

/**
 * Initialize the agent with CDP Agentkit
 *
 * @returns Agent executor and config
 */
async function initializeAgent() {
  try {
    console.log("Initializing agent...");

    // Add network selection before LLM initialization
    const selectedNetwork = await selectNetwork();
    console.log(`Selected network: ${selectedNetwork}`);

    // Define network configuration according to Network interface
    const network: Network = {
      protocolFamily: "evm",
      networkId: selectedNetwork,
      chainId: selectedNetwork === "base" ? "8453" : "84532", // Base mainnet or Base Sepolia
    };

    console.log(`Network: ${network.networkId} (Chain ID: ${network.chainId})`);

    // Create transport configuration
    const transport = http(base.rpcUrls.default.http[0], {
      batch: true,
      fetchOptions: {},
      retryCount: 3,
      retryDelay: 100,
      timeout: 30_000,
    });

    // Create public client
    const publicClient = createPublicClient({
      chain: base,
      transport,
    });

    // Initialize LLM
    const llm = new ChatOpenAI({
      model: "gpt-4-turbo-preview",
      temperature: 0,
    });

    console.log("LLM initialized");

    let walletDataStr: string | null = null;

    // Read existing wallet data if available
    if (fs.existsSync(WALLET_DATA_FILE)) {
      try {
        walletDataStr = fs.readFileSync(WALLET_DATA_FILE, "utf8");
      } catch (error) {
        console.error("Error reading wallet data:", error);
      }
    }

    // Configure CDP Wallet Provider with proper network configuration
    const config = {
      apiKeyName: process.env.CDP_API_KEY_NAME,
      apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      cdpWalletData: walletDataStr || undefined,
      networkId: network.networkId,
      network: network,
      client: publicClient,
    };

    const walletProvider = await CdpWalletProvider.configureWithWallet(config);

    // Initialize AgentKit with BOB Protocol
    const agentkit = await AgentKit.from({
      walletProvider,
      actionProviders: [
        wethActionProvider(),
        pythActionProvider(),
        walletActionProvider(),
        erc20ActionProvider(),
        cdpApiActionProvider({
          apiKeyName: process.env.CDP_API_KEY_NAME,
          apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(
            /\\n/g,
            "\n",
          ),
        }),
        cdpWalletActionProvider({
          apiKeyName: process.env.CDP_API_KEY_NAME,
          apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(
            /\\n/g,
            "\n",
          ),
        }),
        xocolatlActionProvider(),
        bobcProtocolActionProvider(),
      ],
    });

    const tools = await getLangChainTools(agentkit);

    // Store buffered conversation history in memory
    const memory = new MemorySaver();
    const agentConfig = {
      configurable: { thread_id: "CDP AgentKit Chatbot Example!" },
    };

    // Create React Agent using the LLM and CDP AgentKit tools
    const agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      messageModifier: `
        You are a helpful agent that can interact onchain using the Coinbase Developer Platform AgentKit. You are 
        empowered to interact onchain using your tools. If you ever need funds, you can request them from the 
        faucet if you are on network ID 'base-sepolia'. If not, you can provide your wallet details and request 
        funds from the user. Before executing your first action, get the wallet details to see what network 
        you're on. If there is a 5XX (internal) HTTP error code, ask the user to try again later.

        For Base Sepolia testnet, you can use the BOBC Protocol:
        1. First check your WETH balance using get-weth-balance
        2. If needed, claim WETH from the faucet using claim-weth-faucet
        3. Deposit WETH as collateral (requires approval first)
        4. Mint BOBC stablecoins against your collateral (maintain 200% collateralization)
        
        Important BOBC Protocol features:
        - Requires 200% overcollateralization (e.g., $200 WETH collateral = 100 BOBC mint limit)
        - 1 USD = 7 BOB (fixed exchange rate)
        - Uses Chainlink oracles for ETH/USD pricing
        - Monitor your position's health factor to avoid liquidation
        
        Available BOBC tools:
        - Check balances (WETH, BOBC)
        - View collateral information
        - Deposit/withdraw collateral
        - Mint/burn BOBC
        - Monitor health factor
        - Perform liquidations
        `,
    });

    // Save wallet data
    const exportedWallet = await walletProvider.exportWallet();
    fs.writeFileSync(WALLET_DATA_FILE, JSON.stringify(exportedWallet));

    console.log("Agent initialization complete");
    return { agent, config: agentConfig };
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw error;
  }
}

/**
 * Run the agent autonomously with specified intervals
 */
async function runAutonomousMode(agent: any, config: any, interval = 10) {
  console.log("Starting autonomous mode...");

  while (true) {
    try {
      const thought =
        "Be creative and do something interesting on the blockchain. " +
        "Choose an action or set of actions and execute it that highlights your abilities.";

      const stream = await agent.stream(
        { messages: [new HumanMessage(thought)] },
        config,
      );

      for await (const chunk of stream) {
        if ("agent" in chunk) {
          console.log(chunk.agent.messages[0].content);
        } else if ("tools" in chunk) {
          console.log(chunk.tools.messages[0].content);
        }
        console.log("-------------------");
      }

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
async function runChatMode(agent: any, config: any) {
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

      const stream = await agent.stream(
        { messages: [new HumanMessage(userInput)] },
        config,
      );

      for await (const chunk of stream) {
        if ("agent" in chunk) {
          console.log(chunk.agent.messages[0].content);
        } else if ("tools" in chunk) {
          console.log(chunk.tools.messages[0].content);
        }
        console.log("-------------------");
      }
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
async function runTelegramMode(agent: any, config: any) {
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

/**
 * Choose whether to run in autonomous, chat, or telegram mode
 */
async function chooseMode(): Promise<"chat" | "auto" | "telegram"> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  while (true) {
    console.log("\nAvailable modes:");
    console.log("1. chat      - Interactive chat mode");
    console.log("2. telegram  - Telegram bot mode");
    console.log("3. auto      - Autonomous action mode");

    const choice = (await question("\nChoose a mode (enter number or name): "))
      .toLowerCase()
      .trim();

    rl.close();

    if (choice === "1" || choice === "chat") {
      return "chat";
    } else if (choice === "2" || choice === "telegram") {
      return "telegram";
    } else if (choice === "3" || choice === "auto") {
      return "auto";
    }
    console.log("Invalid choice. Please try again.");
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    console.log("Starting initialization...");
    const { agent, config } = await initializeAgent();
    console.log("Agent initialized successfully");

    while (true) {
      const mode = await chooseMode();
      console.log(`Selected mode: ${mode}`);

      if (mode === "chat") {
        await runChatMode(agent, config);
      } else if (mode === "telegram") {
        await runTelegramMode(agent, config);
      } else {
        await runAutonomousMode(agent, config);
      }

      // After any mode exits, we'll loop back to mode selection
      console.log("\nReturning to mode selection...");
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Fatal error:", error.message);
    }
    process.exit(1);
  }
}

main();
