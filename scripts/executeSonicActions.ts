import { SonicActionProvider } from '../src/action-providers/sonic/sonicActionProvider';
import { WS_TOKEN_ADDRESS, USDC_E_TOKEN_ADDRESS } from '../src/action-providers/sonic/constants';
import { createPublicClient, createWalletClient, http, parseEther, ReadContractReturnType } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { EvmWalletProvider, WalletProvider } from "@coinbase/agentkit"; 
import { sonic } from 'viem/chains';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: resolve(__dirname, '../.env') });

// async function createWalletProvider() {
async function createWalletProvider(): Promise<EvmWalletProvider> {
  const privateKey = process.env.WALLET_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error('WALLET_PRIVATE_KEY is not set in .env file');
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const client = createWalletClient({
    account,
    chain: sonic,
    transport: http()
  });

  const publicClient = createPublicClient({
    chain: sonic,
    transport: http()
  });

  // Create a wallet provider that implements EvmWalletProvider interface
  
  const walletProvider = {
    getAddress: async () => account.address,
    sendTransaction: async (tx: any) => {
      return await client.sendTransaction(tx);
    },
    waitForTransactionReceipt: async (hash: `0x${string}`) => {
      return await publicClient.waitForTransactionReceipt({ hash });
    },
    getNetwork: async () => ({ chainId: sonic.id.toString() }),
    signMessage: async (message: string) => {
      return await client.signMessage({ message });
    },
    signTypedData: async (data: any) => {
      return await client.signTypedData(data);
    },
    signTransaction: async (transaction: any) => {
      return await client.signTransaction(transaction);
    },
    readContract: async (params: any) => {
      const result = await publicClient.readContract(params);
      return result as any; // Force the type to be compatible
    },
    // Add the missing properties
    getName: async () => {
      return 'Your Wallet Name'; // Return the name of the wallet
    },
    getBalance: async (address: `0x${string}`) => {
      // Implement logic to get the balance for the given address
      return BigInt(0); // Placeholder, replace with actual balance fetching logic
    },
    nativeTransfer: async (to: `0x${string}`, amount: bigint) => {
      // Implement logic for native token transfer
      return ''; // Placeholder, replace with actual transfer logic
    },
  };

  return walletProvider as unknown as EvmWalletProvider;
}

async function executeSonicActions() {
  console.log('🚀 Initializing Sonic Actions...\n');

  try {
    const walletProvider = await createWalletProvider();
    const provider = new SonicActionProvider();

    // Example token addresses (replace with actual Sonic tokens)
    const TOKEN_A = WS_TOKEN_ADDRESS;
    const TOKEN_B = USDC_E_TOKEN_ADDRESS;

    console.log(`📝 Using wallet address: ${await walletProvider.getAddress()}`);

    // // 1. Regular Sonic Swap
    // try {
    //   console.log('\n📝 Executing Sonic Swap...');
    //   const sonicResult = await provider.swap(walletProvider, {
    //     tokenIn: TOKEN_A,
    //     tokenOut: TOKEN_B,
    //     amountIn: parseEther('0.01').toString(), // 0.1 tokens
    //     slippage: 0.5 // 0.5%
    //   });
    //   console.log('✅ Sonic Swap Result:', sonicResult);
    // } catch (error) {
    //   console.error('❌ Sonic Swap Error:', error);
    // }

    // 2. ODOS Swap
    try {
      console.log('\n📝 Executing ODOS Swap...');
      const odosResult = await provider.swap(walletProvider, {
        tokenIn: TOKEN_A,
        tokenOut: TOKEN_B,
        amountIn: parseEther('0.01').toString(),
        useOdos: true
      });
      console.log('✅ ODOS Swap Result:', odosResult);
    } catch (error) {
      console.error('❌ ODOS Swap Error:', error);
    }

    // // 3. Swap with Custom Slippage
    // try {
    //   console.log('\n📝 Executing Swap with Custom Slippage...');
    //   const slippageResult = await provider.swap(walletProvider, {
    //     tokenIn: TOKEN_A,
    //     tokenOut: TOKEN_B,
    //     amountIn: parseEther('0.1').toString(),
    //     slippage: 1.0 // 1%
    //   });
    //   console.log('✅ Custom Slippage Swap Result:', slippageResult);
    // } catch (error) {
    //   console.error('❌ Custom Slippage Swap Error:', error);
    // }

  } catch (error) {
    console.error('❌ Initialization Error:', error);
    process.exit(1);
  }
}

// Execute if running directly
if (require.main === module) {
  executeSonicActions().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { executeSonicActions };
