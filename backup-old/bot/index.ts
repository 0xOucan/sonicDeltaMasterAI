import { Telegraf, session } from 'telegraf';
import { 
  handleStart, 
  handleMenu, 
  handleDeltaNeutralMenu,
  handleHelp 
} from './commandHandlers';
import { 
  COMMANDS_LIST,
  getMainMenuKeyboard,
  getSwapXMenuKeyboard,
  getDefiStrategiesMenuKeyboard,
  getTokenOperationsMenuKeyboard 
} from './menuHandler';
import { handleActionCallbacks } from './callbackHandlers';
import { showMachFiSupplyForm, showBeefyWithdrawForm } from './forms';
import { SWrapperActionProvider } from '../action-providers/swrapper/sWrapperActionProvider';
import { SwapXActionProvider } from '../action-providers/swapx/swapxActionProvider';
import { MachFiActionProvider } from '../action-providers/machfi/machfiActionProvider';
import { WSSwapXBeefyActionProvider } from '../action-providers/wsswapx-beefy/wsSwapXBeefyActionProvider';
import { USDCeSwapXBeefyActionProvider } from '../action-providers/usdce-swapx-beefy/usdceSwapXBeefyActionProvider';
import { DeltaNeutralActionProvider } from '../action-providers/delta-neutral/deltaNeutralActionProvider';
import { BalanceCheckerActionProvider } from '../action-providers/balance-checker/balanceCheckerActionProvider';
import { AaveSupplyActionProvider } from '../action-providers/aave-supply/aaveSupplyActionProvider';

// Add direct action mapping for transaction commands
const ACTION_PROVIDER_MAPPING: Record<string, string> = {
  // S Wrapper actions
  'wrap-s': 'wrapS',
  'unwrap-ws': 'unwrapS',
  'transfer': 'transferWS',
  
  // SwapX actions
  'swapx-s-to-usdce': 'swapSToUSDCe',
  'swapx-usdce-to-s': 'swapUSDCeToS',
  
  // MachFi actions
  'machfi-supply-collateral': 'supplyUSDCe', // Will handle other assets in the method
  'machfi-borrow': 'borrow',
  'machfi-repay': 'repay',
  'machfi-dashboard': 'machfiDashboard',
  
  // Strategy execution
  'execute-machfi-delta-neutral': 'executeMachFiDeltaNeutral',
  'execute-aave-delta-neutral': 'executeAaveDeltaNeutral',
  'execute-ws-strategy': 'executeFullStrategy', // WSSwapXBeefyActionProvider
  'execute-usdce-strategy': 'executeFullStrategy', // USDCeSwapXBeefyActionProvider
  
  // Withdrawal actions
  'withdraw-from-ws-strategy': 'withdrawPosition', // WSSwapXBeefyActionProvider 
  'withdraw-from-usdc-strategy': 'withdrawStrategy', // USDCeSwapXBeefyActionProvider
  
  // Dashboard and info actions
  'check-balances': 'checkBalances',
  'check-wallet': 'checkWallet',
  'check-portfolio': 'checkPortfolio',
  'aave-dashboard': 'aaveDashboard',
  'delta-neutral-apy': 'checkDeltaNeutralApy',
  'ws-strategy-info': 'getStrategyInfo', // WSSwapXBeefyActionProvider
  'usdc-strategy-info': 'getStrategyInfo' // USDCeSwapXBeefyActionProvider
};

// Helper function to simplify contract error messages
function simplifyContractError(error: unknown): string {
  const errorStr = error instanceof Error ? error.message : String(error);
  
  // Common contract errors and their user-friendly messages
  if (errorStr.includes('ContractFunctionExecutionError')) {
    if (errorStr.includes('balanceOf')) {
      return 'Contract error: Unable to check token balance. The token contract may be invalid or not responding.';
    }
    if (errorStr.includes('getReserveData')) {
      return 'Contract error: Unable to fetch data from Aave. The protocol may be temporarily unavailable.';
    }
    if (errorStr.includes('insufficient funds')) {
      return 'Transaction error: Insufficient funds for this operation. Please check your wallet balance.';
    }
    if (errorStr.includes('exceeded') || errorStr.includes('exceeds')) {
      return 'Transaction error: Amount exceeds available limits. Please try a smaller amount.';
    }
    return 'Contract error: The transaction could not be executed. Please try again later.';
  }
  
  // MachFi specific errors
  if (errorStr.includes('machfi')) {
    if (errorStr.includes('supply')) {
      return 'MachFi error: Unable to supply collateral. Please check your balance and try again.';
    }
    if (errorStr.includes('borrow')) {
      return 'MachFi error: Unable to borrow. Please check your collateral and borrowing capacity.';
    }
    if (errorStr.includes('repay')) {
      return 'MachFi error: Unable to repay. Please check your balance and try again.';
    }
  }
  
  // Wrapping/unwrapping errors
  if (errorStr.includes('wrap') || errorStr.includes('unwrap')) {
    if (errorStr.includes('allowance')) {
      return 'Transaction error: Token allowance required. Please approve the tokens first.';
    }
    if (errorStr.includes('balance')) {
      return 'Transaction error: Insufficient token balance for this operation.';
    }
  }
  
  // Generic "address not a contract" errors
  if (errorStr.includes('address is not a contract')) {
    return 'Contract error: The specified address is not a valid contract. Please check the contract address.';
  }
  
  // Return the original error if no specific handling exists
  return errorStr;
}

export async function initTelegramBot(token: string, agent: any) {
  const bot = new Telegraf(token);
  
  // Bot configuration
  const config = {
    debug: true, // Set to true to enable verbose logging
    logActions: true, // Set to true to log all action executions
    logCallbacks: true // Set to true to log all callback queries
  };
  
  // Log all available action providers for debugging
  console.log("Available action providers:");
  agent.actionProviders.forEach((provider: any, index: number) => {
    console.log(`Provider ${index + 1}: ${provider.constructor.name}`);
    try {
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(provider))
        .filter(name => typeof provider[name] === 'function' && name !== 'constructor');
      console.log(`  Methods: ${methods.join(', ')}`);
    } catch (e) {
      console.log(`  Error getting methods: ${e}`);
    }
  });
  
  // Create a wrapper around the agent to provide the executeAction method
  const agentWithExecuteAction = {
    ...agent,
    executeAction: async (actionId: string, parameters: any = {}) => {
      // Extract action parameters for better logging
      let actionParams = "";
      let baseActionId = actionId;
      
      if (typeof actionId === 'string' && actionId.includes(' ')) {
        const parts = actionId.split(' ');
        baseActionId = parts[0];
        actionParams = parts.slice(1).join(' ');
      }
      
      // Always log transaction actions for clarity
      const isTransactionAction = baseActionId.startsWith('wrap-') || 
        baseActionId.startsWith('unwrap-') || 
        baseActionId.startsWith('machfi-') || 
        baseActionId.startsWith('execute') || 
        baseActionId === 'transfer' ||
        baseActionId.startsWith('swapx-');
        
      if (isTransactionAction || config.logActions) {
        console.log(`🔔 Executing action: ${baseActionId}${actionParams ? ` with params: ${actionParams}` : ''}`);
      }
      
      // Add debug logging for action providers
      if (config.debug || isTransactionAction) {
        console.log('Available action providers for this action:');
        agent.actionProviders.forEach((provider: any, index: number) => {
          console.log(`  ${index + 1}. ${provider.constructor.name}`);
          
          try {
            const actions = provider.getActions ? provider.getActions() : [];
            console.log(`     Actions (${actions.length}): ${actions.map((a: any) => a.name).join(', ')}`);
          } catch (e) {
            console.log(`     Error getting actions: ${e}`);
          }
        });
      }
      
      try {
        // Parse parameters if they were passed as part of the actionId string
        let parsedParams = parameters;
        if (actionParams) {
          try {
            // If it's a JSON string, parse it
            if (actionParams.trim().startsWith('{')) {
              parsedParams = JSON.parse(actionParams);
            } else {
              // Otherwise, try to intelligently parse command-style params
              const paramParts = actionParams.trim().split(' ');
              if (paramParts.length === 1) {
                // Single parameter - likely an amount
                parsedParams = { amount: paramParts[0] };
              } else if (paramParts.length === 2) {
                // Two parameters - likely amount and token/asset
                parsedParams = { amount: paramParts[0], asset: paramParts[1], token: paramParts[1] };
              } else if (paramParts.length === 3) {
                // Three parameters - likely amount, token, and address
                parsedParams = { amount: paramParts[0], token: paramParts[1], to: paramParts[2], asset: paramParts[1] };
              }
            }
            if (config.debug || isTransactionAction) {
              console.log(`Parsed parameters:`, parsedParams);
            }
          } catch (e) {
            console.log(`Error parsing parameters from actionId string: ${e}`);
            // Fall back to using the raw string
            parsedParams = { rawParams: actionParams };
          }
        }
        
        // DIRECT EXECUTION PATH FOR CRITICAL ACTIONS
        // Instead of trying to find providers, directly execute known actions
        if (baseActionId === 'wrap-s') {
          console.log('🔹 DIRECT EXECUTION: Using direct wrapS implementation');
          // Find any provider with a wrapS method
          for (const provider of agent.actionProviders) {
            if (typeof provider.wrapS === 'function') {
              console.log(`Found provider with wrapS method: ${provider.constructor.name}`);
              try {
                return await provider.wrapS(agent.walletProvider, parsedParams);
              } catch (error) {
                console.error('Error executing wrapS directly:', error);
                throw new Error(simplifyContractError(error));
              }
            }
          }
          // If we can't find a provider with wrapS, try to create one
          try {
            console.log('Creating new SWrapperActionProvider instance');
            const { SWrapperActionProvider } = await import('../action-providers/swrapper/sWrapperActionProvider');
            const provider = new SWrapperActionProvider();
            return await provider.wrapS(agent.walletProvider, parsedParams);
          } catch (error) {
            console.error('Error creating SWrapperActionProvider:', error);
            throw new Error(`Could not execute wrap-s action: ${simplifyContractError(error)}`);
          }
        }
        
        if (baseActionId === 'unwrap-ws') {
          console.log('🔹 DIRECT EXECUTION: Using direct unwrapS implementation');
          // Find any provider with an unwrapS method
          for (const provider of agent.actionProviders) {
            if (typeof provider.unwrapS === 'function') {
              console.log(`Found provider with unwrapS method: ${provider.constructor.name}`);
              try {
                return await provider.unwrapS(agent.walletProvider, parsedParams);
              } catch (error) {
                console.error('Error executing unwrapS directly:', error);
                throw new Error(simplifyContractError(error));
              }
            }
          }
          // If we can't find a provider with unwrapS, try to create one
          try {
            console.log('Creating new SWrapperActionProvider instance');
            const { SWrapperActionProvider } = await import('../action-providers/swrapper/sWrapperActionProvider');
            const provider = new SWrapperActionProvider();
            return await provider.unwrapS(agent.walletProvider, parsedParams);
          } catch (error) {
            console.error('Error creating SWrapperActionProvider:', error);
            throw new Error(`Could not execute unwrap-ws action: ${simplifyContractError(error)}`);
          }
        }
        
        if (baseActionId.startsWith('swapx-')) {
          console.log('🔹 DIRECT EXECUTION: Using direct SwapX implementation');
          const methodName = baseActionId === 'swapx-s-to-usdce' ? 'swapSToUSDCe' : 
                            baseActionId === 'swapx-usdce-to-s' ? 'swapUSDCeToS' : '';
          
          if (!methodName) {
            throw new Error(`Unknown SwapX action: ${baseActionId}`);
          }
          
          // Find any provider with the required method
          for (const provider of agent.actionProviders) {
            if (typeof provider[methodName] === 'function') {
              console.log(`Found provider with ${methodName} method: ${provider.constructor.name}`);
              try {
                return await provider[methodName](agent.walletProvider, parsedParams);
              } catch (error) {
                console.error(`Error executing ${methodName} directly:`, error);
                throw new Error(simplifyContractError(error));
              }
            }
          }
          
          // If we can't find a provider, try to create one
          try {
            console.log('Creating new SwapXActionProvider instance');
            const { SwapXActionProvider } = await import('../action-providers/swapx/swapxActionProvider');
            const provider = new SwapXActionProvider();
            return await provider[methodName](agent.walletProvider, parsedParams);
          } catch (error) {
            console.error('Error creating SwapXActionProvider:', error);
            throw new Error(`Could not execute ${baseActionId} action: ${simplifyContractError(error)}`);
          }
        }
        
        if (baseActionId.startsWith('machfi-')) {
          console.log('🔹 DIRECT EXECUTION: Using direct MachFi implementation');
          let methodName = '';
          
          if (baseActionId === 'machfi-supply-collateral') {
            if (parsedParams.asset && parsedParams.asset.toUpperCase() === 'S') {
              methodName = 'supplyS';
            } else {
              methodName = 'supplyUSDCe';
            }
          } else if (baseActionId === 'machfi-borrow') {
            methodName = 'borrow';
          } else if (baseActionId === 'machfi-repay') {
            methodName = 'repay';
          } else if (baseActionId === 'machfi-dashboard') {
            methodName = 'machfiDashboard';
          }
          
          if (!methodName) {
            throw new Error(`Unknown MachFi action: ${baseActionId}`);
          }
          
          // Find any provider with the required method
          for (const provider of agent.actionProviders) {
            if (typeof provider[methodName] === 'function') {
              console.log(`Found provider with ${methodName} method: ${provider.constructor.name}`);
              try {
                return await (provider as any)[methodName](agent.walletProvider, parsedParams);
              } catch (error) {
                console.error(`Error executing ${methodName} directly:`, error);
                throw new Error(simplifyContractError(error));
              }
            }
          }
          
          // If we can't find a provider, try to create one
          try {
            console.log('Creating new MachFiActionProvider instance');
            const { MachFiActionProvider } = await import('../action-providers/machfi/machfiActionProvider');
            const provider = new MachFiActionProvider();
            return await (provider as any)[methodName](agent.walletProvider, parsedParams);
          } catch (error) {
            console.error('Error creating MachFiActionProvider:', error);
            throw new Error(`Could not execute ${baseActionId} action: ${simplifyContractError(error)}`);
          }
        }
        
        if (baseActionId === 'transfer') {
          console.log('🔹 DIRECT EXECUTION: Using direct transfer implementation');
          // Find any provider with a transferWS method
          for (const provider of agent.actionProviders) {
            if (typeof provider.transferWS === 'function') {
              console.log(`Found provider with transferWS method: ${provider.constructor.name}`);
              try {
                return await provider.transferWS(agent.walletProvider, parsedParams);
              } catch (error) {
                console.error('Error executing transferWS directly:', error);
                throw new Error(simplifyContractError(error));
              }
            }
          }
          
          // If we can't find a provider, try to create one
          try {
            console.log('Creating new SWrapperActionProvider instance');
            const { SWrapperActionProvider } = await import('../action-providers/swrapper/sWrapperActionProvider');
            const provider = new SWrapperActionProvider();
            return await provider.transferWS(agent.walletProvider, parsedParams);
          } catch (error) {
            console.error('Error creating SWrapperActionProvider for transfer:', error);
            throw new Error(`Could not execute transfer action: ${simplifyContractError(error)}`);
          }
        }
        
        if (baseActionId.startsWith('execute-') && baseActionId.includes('delta')) {
          console.log('🔹 DIRECT EXECUTION: Using direct Delta Neutral implementation');
          const methodName = baseActionId === 'execute-machfi-delta-neutral' ? 'executeMachFiDeltaNeutral' :
                            baseActionId === 'execute-aave-delta-neutral' ? 'executeAaveDeltaNeutral' : '';
          
          if (!methodName) {
            throw new Error(`Unknown Delta Neutral action: ${baseActionId}`);
          }
          
          // Find any provider with the required method
          for (const provider of agent.actionProviders) {
            if (typeof provider[methodName] === 'function') {
              console.log(`Found provider with ${methodName} method: ${provider.constructor.name}`);
              try {
                return await (provider as any)[methodName](agent.walletProvider, parsedParams);
              } catch (error) {
                console.error(`Error executing ${methodName} directly:`, error);
                throw new Error(simplifyContractError(error));
              }
            }
          }
          
          // If we can't find a provider, try to create one
          try {
            console.log('Creating new DeltaNeutralActionProvider instance');
            const { DeltaNeutralActionProvider } = await import('../action-providers/delta-neutral/deltaNeutralActionProvider');
            const provider = new DeltaNeutralActionProvider();
            return await (provider as any)[methodName](agent.walletProvider, parsedParams);
          } catch (error) {
            console.error('Error creating DeltaNeutralActionProvider:', error);
            throw new Error(`Could not execute ${baseActionId} action: ${simplifyContractError(error)}`);
          }
        }
        
        // Handle Beefy strategy executions
        if (baseActionId === 'execute-ws-strategy' || baseActionId === 'ws-strategy-info') {
          console.log('🔹 DIRECT EXECUTION: Using direct WSSwapXBeefyActionProvider implementation');
          const methodName = baseActionId === 'execute-ws-strategy' ? 'executeFullStrategy' : 'getStrategyInfo';
          
          // Find any provider with the required method
          for (const provider of agent.actionProviders) {
            if (typeof provider[methodName] === 'function') {
              console.log(`Found provider with ${methodName} method: ${provider.constructor.name}`);
              try {
                return await (provider as any)[methodName](agent.walletProvider, parsedParams);
              } catch (error) {
                console.error(`Error executing ${methodName} directly:`, error);
                throw new Error(simplifyContractError(error));
              }
            }
          }
          
          // If we can't find a provider, try to create one
          try {
            console.log('Creating new WSSwapXBeefyActionProvider instance');
            const { WSSwapXBeefyActionProvider } = await import('../action-providers/wsswapx-beefy/wsSwapXBeefyActionProvider');
            const provider = new WSSwapXBeefyActionProvider();
            return await (provider as any)[methodName](agent.walletProvider, parsedParams);
          } catch (error) {
            console.error('Error creating WSSwapXBeefyActionProvider:', error);
            throw new Error(`Could not execute ${baseActionId} action: ${simplifyContractError(error)}`);
          }
        }
        
        if (baseActionId === 'execute-usdce-strategy' || baseActionId === 'usdc-strategy-info') {
          console.log('🔹 DIRECT EXECUTION: Using direct USDCeSwapXBeefyActionProvider implementation');
          const methodName = baseActionId === 'execute-usdce-strategy' ? 'executeFullStrategy' : 'getStrategyInfo';
          
          // Find any provider with the required method
          for (const provider of agent.actionProviders) {
            if (typeof provider[methodName] === 'function') {
              console.log(`Found provider with ${methodName} method: ${provider.constructor.name}`);
              try {
                return await (provider as any)[methodName](agent.walletProvider, parsedParams);
              } catch (error) {
                console.error(`Error executing ${methodName} directly:`, error);
                throw new Error(simplifyContractError(error));
              }
            }
          }
          
          // If we can't find a provider, try to create one
          try {
            console.log('Creating new USDCeSwapXBeefyActionProvider instance');
            const { USDCeSwapXBeefyActionProvider } = await import('../action-providers/usdce-swapx-beefy/usdceSwapXBeefyActionProvider');
            const provider = new USDCeSwapXBeefyActionProvider();
            return await (provider as any)[methodName](agent.walletProvider, parsedParams);
          } catch (error) {
            console.error('Error creating USDCeSwapXBeefyActionProvider:', error);
            throw new Error(`Could not execute ${baseActionId} action: ${simplifyContractError(error)}`);
          }
        }
        
        // Handle withdrawal actions
        if (baseActionId.startsWith('withdraw-from-')) {
          console.log('🔹 DIRECT EXECUTION: Using direct withdrawal implementation');
          let methodName = '';
          let providerType = '';
          
          if (baseActionId === 'withdraw-from-ws-strategy') {
            methodName = 'withdrawPosition';
            providerType = 'WSSwapXBeefyActionProvider';
          } else if (baseActionId === 'withdraw-from-usdc-strategy') {
            methodName = 'withdrawStrategy';
            providerType = 'USDCeSwapXBeefyActionProvider';
          }
          
          if (!methodName) {
            throw new Error(`Unknown withdrawal action: ${baseActionId}`);
          }
          
          // Find any provider with the required method
          for (const provider of agent.actionProviders) {
            if (typeof provider[methodName] === 'function') {
              console.log(`Found provider with ${methodName} method: ${provider.constructor.name}`);
              try {
                return await (provider as any)[methodName](agent.walletProvider, parsedParams);
              } catch (error) {
                console.error(`Error executing ${methodName} directly:`, error);
                throw new Error(simplifyContractError(error));
              }
            }
          }
          
          // If we can't find a provider, try to create one
          try {
            if (providerType === 'WSSwapXBeefyActionProvider') {
              console.log('Creating new WSSwapXBeefyActionProvider instance');
              const { WSSwapXBeefyActionProvider } = await import('../action-providers/wsswapx-beefy/wsSwapXBeefyActionProvider');
              const provider = new WSSwapXBeefyActionProvider();
              return await (provider as any)[methodName](agent.walletProvider, parsedParams);
            } else {
              console.log('Creating new USDCeSwapXBeefyActionProvider instance');
              const { USDCeSwapXBeefyActionProvider } = await import('../action-providers/usdce-swapx-beefy/usdceSwapXBeefyActionProvider');
              const provider = new USDCeSwapXBeefyActionProvider();
              return await (provider as any)[methodName](agent.walletProvider, parsedParams);
            }
          } catch (error) {
            console.error(`Error creating provider for ${baseActionId}:`, error);
            throw new Error(`Could not execute ${baseActionId} action: ${simplifyContractError(error)}`);
          }
        }
        
        // Handle account information actions
        if (baseActionId === 'check-balances' || baseActionId === 'check-wallet') {
          console.log('🔹 DIRECT EXECUTION: Using direct balance checker implementation');
          const methodName = baseActionId === 'check-balances' ? 'checkBalances' : 'checkWallet';
          
          // Find any provider with the required method
          for (const provider of agent.actionProviders) {
            if (typeof provider[methodName] === 'function') {
              console.log(`Found provider with ${methodName} method: ${provider.constructor.name}`);
              try {
                return await (provider as any)[methodName](agent.walletProvider, parsedParams);
              } catch (error) {
                console.error(`Error executing ${methodName} directly:`, error);
                throw new Error(simplifyContractError(error));
              }
            }
          }
          
          // If we can't find a provider, try to create one
          try {
            console.log('Creating new BalanceCheckerActionProvider instance');
            const { BalanceCheckerActionProvider } = await import('../action-providers/balance-checker/balanceCheckerActionProvider');
            const provider = new BalanceCheckerActionProvider();
            return await (provider as any)[methodName](agent.walletProvider, parsedParams);
          } catch (error) {
            console.error('Error creating BalanceCheckerActionProvider:', error);
            throw new Error(`Could not execute ${baseActionId} action: ${simplifyContractError(error)}`);
          }
        }
        
        if (baseActionId === 'check-portfolio') {
          console.log('🔹 DIRECT EXECUTION: Using direct beefy portfolio checker implementation');
          const methodName = 'checkPortfolio';
          
          // Find any provider with the required method
          for (const provider of agent.actionProviders) {
            if (typeof provider[methodName] === 'function') {
              console.log(`Found provider with ${methodName} method: ${provider.constructor.name}`);
              try {
                return await (provider as any)[methodName](agent.walletProvider, parsedParams);
              } catch (error) {
                console.error(`Error executing ${methodName} directly:`, error);
                throw new Error(simplifyContractError(error));
              }
            }
          }
          
          // If we can't find a provider, try to create one
          try {
            console.log('Creating new BeefyPortfolioActionProvider instance');
            const { BeefyPortfolioActionProvider } = await import('../action-providers/beefy-portfolio/beefyPortfolioActionProvider');
            const provider = new BeefyPortfolioActionProvider();
            return await (provider as any)[methodName](agent.walletProvider, parsedParams);
          } catch (error) {
            console.error('Error creating BeefyPortfolioActionProvider:', error);
            throw new Error(`Could not execute ${baseActionId} action: ${simplifyContractError(error)}`);
          }
        }
        
        if (baseActionId === 'aave-dashboard') {
          console.log('🔹 DIRECT EXECUTION: Using direct aave dashboard implementation');
          const methodName = 'aaveDashboard';
          
          // Find any provider with the required method
          for (const provider of agent.actionProviders) {
            if (typeof provider[methodName] === 'function') {
              console.log(`Found provider with ${methodName} method: ${provider.constructor.name}`);
              try {
                return await (provider as any)[methodName](agent.walletProvider, parsedParams);
              } catch (error) {
                console.error(`Error executing ${methodName} directly:`, error);
                throw new Error(simplifyContractError(error));
              }
            }
          }
          
          // If we can't find a provider, try to create one
          try {
            console.log('Creating new AaveSupplyActionProvider instance');
            const { AaveSupplyActionProvider } = await import('../action-providers/aave-supply/aaveSupplyActionProvider');
            const provider = new AaveSupplyActionProvider();
            return await (provider as any)[methodName](agent.walletProvider, parsedParams);
          } catch (error) {
            console.error('Error creating AaveSupplyActionProvider:', error);
            throw new Error(`Could not execute ${baseActionId} action: ${simplifyContractError(error)}`);
          }
        }
        
        if (baseActionId === 'delta-neutral-apy') {
          console.log('🔹 DIRECT EXECUTION: Using direct delta neutral APY implementation');
          const methodName = 'checkDeltaNeutralApy';
          
          // Find any provider with the required method
          for (const provider of agent.actionProviders) {
            if (typeof provider[methodName] === 'function') {
              console.log(`Found provider with ${methodName} method: ${provider.constructor.name}`);
              try {
                return await (provider as any)[methodName](agent.walletProvider, parsedParams);
              } catch (error) {
                console.error(`Error executing ${methodName} directly:`, error);
                throw new Error(simplifyContractError(error));
              }
            }
          }
          
          // If we can't find a provider, try to create one
          try {
            console.log('Creating new DeltaNeutralActionProvider instance');
            const { DeltaNeutralActionProvider } = await import('../action-providers/delta-neutral/deltaNeutralActionProvider');
            const provider = new DeltaNeutralActionProvider();
            return await (provider as any)[methodName](agent.walletProvider, parsedParams);
          } catch (error) {
            console.error('Error creating DeltaNeutralActionProvider:', error);
            throw new Error(`Could not execute ${baseActionId} action: ${simplifyContractError(error)}`);
          }
        }
        
        // REGULAR EXECUTION PATH (FALLBACK)
        // Set a flag to track if we found an action provider
        let actionFound = false;
        let errorMessages: string[] = [];
        
        // Look up the mapped method name if it exists
        const mappedMethodName = ACTION_PROVIDER_MAPPING[baseActionId];
        
        if (mappedMethodName) {
          if (config.logActions || isTransactionAction) {
            console.log(`Using mapped method name: ${mappedMethodName} for action ${baseActionId}`);
          }
          
          // Special case handling for different providers
          if (baseActionId === 'machfi-supply-collateral' && parsedParams.asset) {
            // Handle different assets for MachFi supplying
            if (parsedParams.asset.toUpperCase() === 'S') {
              actionFound = true;
              return await agent.actionProviders.find((p: any) => p.constructor.name === 'MachFiActionProvider')?.supplyS(agent.walletProvider, parsedParams);
            } else if (parsedParams.asset.toUpperCase() === 'USDC.E' || parsedParams.asset.toUpperCase() === 'USDC_E' || parsedParams.asset.toUpperCase() === 'USDCE') {
              actionFound = true;
              return await agent.actionProviders.find((p: any) => p.constructor.name === 'MachFiActionProvider')?.supplyUSDCe(agent.walletProvider, parsedParams);
            }
          }
          
          // Find the appropriate provider based on the action
          if (baseActionId.startsWith('wrap-') || baseActionId.startsWith('unwrap-') || baseActionId === 'transfer') {
            actionFound = true;
            // Add debug info to check provider types
            if (config.debug) {
              console.log("Looking for SWrapperActionProvider...");
              agent.actionProviders.forEach((p: any, index: number) => {
                console.log(`Provider ${index}: ${p.constructor.name}, instanceof SWrapperActionProvider: ${p instanceof SWrapperActionProvider}`);
              });
            }
            
            // Try to find the provider by checking both the name and the instance type
            const provider = agent.actionProviders.find((p: any) => 
              p.constructor.name === 'SWrapperActionProvider' || 
              (typeof p.wrapS === 'function' && typeof p.unwrapS === 'function')
            );
            
            if (provider) {
              return await (provider as any)[mappedMethodName](agent.walletProvider, parsedParams);
            } else {
              throw new Error(`SWrapperActionProvider not found or doesn't have ${mappedMethodName} method`);
            }
          } else if (baseActionId.startsWith('swapx-')) {
            actionFound = true;
            // Find SwapXActionProvider by checking both name and methods
            const provider = agent.actionProviders.find((p: any) => 
              p.constructor.name === 'SwapXActionProvider' || 
              (typeof p.swapSToUSDCe === 'function' && typeof p.swapUSDCeToS === 'function')
            );
            
            if (provider) {
              return await (provider as any)[mappedMethodName](agent.walletProvider, parsedParams);
            } else {
              throw new Error(`SwapXActionProvider not found or doesn't have ${mappedMethodName} method`);
            }
          } else if (baseActionId.startsWith('machfi-')) {
            actionFound = true;
            // Find MachFiActionProvider by checking both name and methods
            const provider = agent.actionProviders.find((p: any) => 
              p.constructor.name === 'MachFiActionProvider' || 
              (typeof p.machfiDashboard === 'function')
            );
            
            if (provider) {
              return await (provider as any)[mappedMethodName](agent.walletProvider, parsedParams);
            } else {
              throw new Error(`MachFiActionProvider not found or doesn't have ${mappedMethodName} method`);
            }
          } else if (baseActionId === 'execute-ws-strategy') {
            actionFound = true;
            // Find WSSwapXBeefyActionProvider by checking both name and methods
            const provider = agent.actionProviders.find((p: any) => 
              p.constructor.name === 'WSSwapXBeefyActionProvider' || 
              (typeof p.executeFullStrategy === 'function' && typeof p.getStrategyInfo === 'function')
            );
            
            if (provider) {
              return await (provider as any)[mappedMethodName](agent.walletProvider, parsedParams);
            } else {
              throw new Error(`WSSwapXBeefyActionProvider not found or doesn't have ${mappedMethodName} method`);
            }
          } else if (baseActionId === 'execute-usdce-strategy') {
            actionFound = true;
            // Find USDCeSwapXBeefyActionProvider by checking both name and methods
            const provider = agent.actionProviders.find((p: any) => 
              p.constructor.name === 'USDCeSwapXBeefyActionProvider' || 
              (typeof p.executeFullStrategy === 'function' && typeof p.getStrategyInfo === 'function')
            );
            
            if (provider) {
              return await (provider as any)[mappedMethodName](agent.walletProvider, parsedParams);
            } else {
              throw new Error(`USDCeSwapXBeefyActionProvider not found or doesn't have ${mappedMethodName} method`);
            }
          } else if (baseActionId === 'ws-strategy-info') {
            actionFound = true;
            // Find WSSwapXBeefyActionProvider by checking both name and methods
            const provider = agent.actionProviders.find((p: any) => 
              p.constructor.name === 'WSSwapXBeefyActionProvider' || 
              (typeof p.executeFullStrategy === 'function' && typeof p.getStrategyInfo === 'function')
            );
            
            if (provider) {
              return await (provider as any)[mappedMethodName](agent.walletProvider, parsedParams);
            } else {
              throw new Error(`WSSwapXBeefyActionProvider not found or doesn't have ${mappedMethodName} method`);
            }
          } else if (baseActionId === 'usdc-strategy-info') {
            actionFound = true;
            // Find USDCeSwapXBeefyActionProvider by checking both name and methods
            const provider = agent.actionProviders.find((p: any) => 
              p.constructor.name === 'USDCeSwapXBeefyActionProvider' || 
              (typeof p.executeFullStrategy === 'function' && typeof p.getStrategyInfo === 'function')
            );
            
            if (provider) {
              return await (provider as any)[mappedMethodName](agent.walletProvider, parsedParams);
            } else {
              throw new Error(`USDCeSwapXBeefyActionProvider not found or doesn't have ${mappedMethodName} method`);
            }
          } else if (baseActionId.startsWith('execute-') && baseActionId.includes('delta')) {
            actionFound = true;
            // Find DeltaNeutralActionProvider by checking both name and methods
            const provider = agent.actionProviders.find((p: any) => 
              p.constructor.name === 'DeltaNeutralActionProvider' || 
              (typeof p.executeMachFiDeltaNeutral === 'function' && typeof p.executeAaveDeltaNeutral === 'function')
            );
            
            if (provider) {
              return await (provider as any)[mappedMethodName](agent.walletProvider, parsedParams);
            } else {
              throw new Error(`DeltaNeutralActionProvider not found or doesn't have ${mappedMethodName} method`);
            }
          } else if (baseActionId === 'delta-neutral-apy') {
            actionFound = true;
            // Find DeltaNeutralActionProvider by checking both name and methods
            const provider = agent.actionProviders.find((p: any) => 
              p.constructor.name === 'DeltaNeutralActionProvider' || 
              (typeof p.checkDeltaNeutralApy === 'function')
            );
            
            if (provider) {
              return await (provider as any)[mappedMethodName](agent.walletProvider, parsedParams);
            } else {
              throw new Error(`DeltaNeutralActionProvider not found or doesn't have ${mappedMethodName} method`);
            }
          } else if (baseActionId.startsWith('withdraw-from-')) {
            // Handle withdrawal actions
            if (baseActionId === 'withdraw-from-ws-strategy') {
              actionFound = true;
              // Find WSSwapXBeefyActionProvider
              const provider = agent.actionProviders.find((p: any) => 
                p.constructor.name === 'WSSwapXBeefyActionProvider' || 
                (typeof p.withdrawPosition === 'function' && typeof p.getStrategyInfo === 'function')
              );
              
              if (provider) {
                return await (provider as any)[mappedMethodName](agent.walletProvider, parsedParams);
              } else {
                throw new Error(`WSSwapXBeefyActionProvider not found or doesn't have ${mappedMethodName} method`);
              }
            } else if (baseActionId === 'withdraw-from-usdc-strategy') {
              actionFound = true;
              // Find USDCeSwapXBeefyActionProvider
              const provider = agent.actionProviders.find((p: any) => 
                p.constructor.name === 'USDCeSwapXBeefyActionProvider' || 
                (typeof p.withdrawStrategy === 'function' && typeof p.getStrategyInfo === 'function')
              );
              
              if (provider) {
                return await (provider as any)[mappedMethodName](agent.walletProvider, parsedParams);
              } else {
                throw new Error(`USDCeSwapXBeefyActionProvider not found or doesn't have ${mappedMethodName} method`);
              }
            }
          } else if (baseActionId.startsWith('check-') || baseActionId === 'aave-dashboard') {
            // These are likely in BalanceCheckerActionProvider or AaveSupplyActionProvider
            actionFound = true;
            
            // First try to find in BalanceCheckerActionProvider
            let provider = agent.actionProviders.find((p: any) => 
              p.constructor.name === 'BalanceCheckerActionProvider' || 
              (typeof p.checkBalances === 'function' && typeof p.checkWallet === 'function')
            );
            
            if (provider && typeof provider[mappedMethodName] === 'function') {
              return await (provider as any)[mappedMethodName](agent.walletProvider, parsedParams);
            }
            
            // If not found, try AaveSupplyActionProvider
            provider = agent.actionProviders.find((p: any) => 
              p.constructor.name === 'AaveSupplyActionProvider' || 
              (typeof p.aaveDashboard === 'function')
            );
            
            if (provider && typeof provider[mappedMethodName] === 'function') {
              return await (provider as any)[mappedMethodName](agent.walletProvider, parsedParams);
            }
            
            // If still not found, look in any provider
            for (const provider of agent.actionProviders) {
              if (provider[mappedMethodName] && typeof provider[mappedMethodName] === 'function') {
                return await (provider as any)[mappedMethodName](agent.walletProvider, parsedParams);
              }
            }
            
            throw new Error(`No provider found with method ${mappedMethodName}`);
          }
        }
        
        // Continue with the original logic as a fallback
        for (const provider of agent.actionProviders) {
          try {
            // Get available actions from this provider
            const actions = provider.getActions();
            // Find the action with the matching ID
            const action = actions.find((a: any) => a.name === baseActionId);
            if (action) {
              if (config.logActions) {
                console.log(`Found action ${baseActionId} in provider ${provider.constructor.name}`);
              }
              
              // Execute the action with the provider
              actionFound = true;
              return await (provider as any)[action.methodName](agent.walletProvider, parsedParams);
            }
          } catch (error) {
            if (config.debug) {
              console.error(`Error checking provider ${provider.constructor.name}:`, error);
            }
            errorMessages.push(simplifyContractError(error));
          }
        }
        
        // Fallback: Try to find a method that directly matches the action name
        // This helps with cases where the action name is the same as the method name
        if (config.logActions || isTransactionAction) {
          console.log(`Trying direct method match for ${baseActionId}`);
        }
        
        const methodNameCandidates = [
          baseActionId,
          baseActionId.replace(/-/g, ''),  // Remove all hyphens
          ...baseActionId.split('-')       // Individual parts (e.g. "wrap" from "wrap-s")
        ];
        
        for (const provider of agent.actionProviders) {
          try {
            for (const methodName of methodNameCandidates) {
              if (typeof provider[methodName] === 'function') {
                if (config.logActions || isTransactionAction) {
                  console.log(`Found direct method ${methodName} in provider ${provider.constructor.name}`);
                }
                actionFound = true;
                return await (provider as any)[methodName](agent.walletProvider, parsedParams);
              }
            }
          } catch (error) {
            if (config.debug) {
              console.error(`Error checking direct methods in provider ${provider.constructor.name}:`, error);
            }
            errorMessages.push(simplifyContractError(error));
          }
        }
        
        // If we couldn't find a matching action, try using the invoke method with a special format
        if (!actionFound) {
          if (config.logActions || isTransactionAction) {
            console.log(`No direct action found for ${baseActionId}, trying invoke method`);
            if (errorMessages.length > 0) {
              console.log(`Errors encountered during action search: ${errorMessages.join('; ')}`);
            }
          }
          
          try {
            // Include any action parameters in the invoke call
            const invokeText = actionParams 
              ? `Execute action: ${baseActionId} ${actionParams}` 
              : `Execute action: ${baseActionId} ${JSON.stringify(parameters)}`;
              
            return await agent.invoke(invokeText);
          } catch (error: unknown) {
            if (config.debug || isTransactionAction) {
              console.error(`Error invoking agent for action ${baseActionId}:`, error);
            }
            throw new Error(simplifyContractError(error));
          }
        }
        
        // If we got this far and didn't return anything, throw an error
        throw new Error(`Failed to execute action '${baseActionId}'. No matching action provider or method found.`);
      } catch (error: unknown) {
        // Format error message for better readability
        const simplifiedError = simplifyContractError(error);
        throw new Error(simplifiedError);
      }
    }
  };
  
  // Set up session middleware
  bot.use(session());
  
  // Set commands for menu button
  await bot.telegram.setMyCommands(COMMANDS_LIST);
  
  // Register command handlers
  bot.command('start', (ctx) => handleStart(ctx));
  bot.command('menu', (ctx) => handleMenu(ctx));
  bot.command('deltaneutral', (ctx) => handleDeltaNeutralMenu(ctx));
  bot.command('help', (ctx) => handleHelp(ctx));
  bot.command('demo', (ctx) => {
    ctx.reply(
      '🚀 Running deFΔI demonstration mode...\n\n' +
      'This will show you the main features of the bot in sequence. Please wait between commands.',
      { parse_mode: 'Markdown' }
    );
    
    // Set a sequence of demonstration actions with timeouts
    setTimeout(() => handleActionCallbacks(ctx, 'action_balance', agentWithExecuteAction), 2000);
    setTimeout(() => handleActionCallbacks(ctx, 'action_wallet', agentWithExecuteAction), 7000);
    setTimeout(() => handleActionCallbacks(ctx, 'action_beefy', agentWithExecuteAction), 12000);
    setTimeout(() => handleActionCallbacks(ctx, 'action_machfi', agentWithExecuteAction), 17000);
    setTimeout(() => handleActionCallbacks(ctx, 'action_delta_neutral_apy', agentWithExecuteAction), 22000);
    setTimeout(() => handleMenu(ctx), 30000);
    
    return;
  });
  bot.command('balance', (ctx) => handleActionCallbacks(ctx, 'action_balance', agentWithExecuteAction));
  bot.command('beefy', (ctx) => handleActionCallbacks(ctx, 'action_beefy', agentWithExecuteAction));
  bot.command('machfi', (ctx) => handleActionCallbacks(ctx, 'action_machfi', agentWithExecuteAction));
  bot.command('aave', (ctx) => handleActionCallbacks(ctx, 'aave-dashboard', agentWithExecuteAction));
  bot.command('apys', (ctx) => handleActionCallbacks(ctx, 'action_delta_neutral_apy', agentWithExecuteAction));
  
  // Strategy commands
  bot.command('wsstrategies', (ctx) => handleActionCallbacks(ctx, 'action_ws_strategy_info', agentWithExecuteAction));
  bot.command('usdcstrategies', (ctx) => handleActionCallbacks(ctx, 'action_usdc_strategy_info', agentWithExecuteAction));
  bot.command('deltaapy', (ctx) => handleActionCallbacks(ctx, 'action_delta_neutral_apy', agentWithExecuteAction));
  
  // Token operation commands
  bot.command('wrap', (ctx) => {
    const match = ctx.message.text.match(/\/wrap\s+(\d+\.?\d*)/);
    if (match && match[1]) {
      const amount = match[1];
      console.log(`Executing wrap command with amount: ${amount}`);
      return handleActionCallbacks(ctx, `wrap-s ${amount}`, agentWithExecuteAction);
    } else {
      return handleActionCallbacks(ctx, 'command_wrap', agentWithExecuteAction);
    }
  });

  bot.command('unwrap', (ctx) => {
    const match = ctx.message.text.match(/\/unwrap\s+(\d+\.?\d*)/);
    if (match && match[1]) {
      const amount = match[1];
      console.log(`Executing unwrap command with amount: ${amount}`);
      return handleActionCallbacks(ctx, `unwrap-ws ${amount}`, agentWithExecuteAction);
    } else {
      return handleActionCallbacks(ctx, 'command_unwrap', agentWithExecuteAction);
    }
  });

  bot.command('transfer', (ctx) => {
    const match = ctx.message.text.match(/\/transfer\s+(\d+\.?\d*)\s+(\w+\.?\w*)\s+(0x[a-fA-F0-9]{40})/);
    if (match && match[1] && match[2] && match[3]) {
      const amount = match[1];
      const token = match[2];
      const address = match[3];
      console.log(`Executing transfer command with params: amount=${amount}, token=${token}, address=${address}`);
      return handleActionCallbacks(ctx, `transfer ${amount} ${token} ${address}`, agentWithExecuteAction);
    } else {
      return handleActionCallbacks(ctx, 'command_transfer', agentWithExecuteAction);
    }
  });

  // Add MachFi form commands
  bot.command('machfisupply', (ctx) => {
    return showMachFiSupplyForm(ctx);
  });
  
  // Add Beefy form commands
  bot.command('withdraw', (ctx) => {
    const match = ctx.message.text.match(/\/withdraw\s+from\s+(\w+-\w+)/);
    if (match && match[1]) {
      const strategy = match[1];
      console.log(`Executing withdraw from ${strategy} command`);
      return handleActionCallbacks(ctx, `withdraw-from-${strategy}`, agentWithExecuteAction);
    } else {
      return showBeefyWithdrawForm(ctx);
    }
  });
  
  // SwapX commands
  bot.command('swaps', (ctx) => {
    const match = ctx.message.text.match(/\/swaps\s+(\d+\.?\d*)/);
    if (match && match[1]) {
      const amount = match[1];
      return handleActionCallbacks(ctx, `swapx-s-to-usdce ${amount}`, agentWithExecuteAction);
    } else {
      return handleActionCallbacks(ctx, 'command_swap_s_to_usdc', agentWithExecuteAction);
    }
  });

  bot.command('swapusdc', (ctx) => {
    const match = ctx.message.text.match(/\/swapusdc\s+(\d+\.?\d*)/);
    if (match && match[1]) {
      const amount = match[1];
      return handleActionCallbacks(ctx, `swapx-usdce-to-s ${amount}`, agentWithExecuteAction);
    } else {
      return handleActionCallbacks(ctx, 'command_swap_usdc_to_s', agentWithExecuteAction);
    }
  });

  // MachFi commands
  bot.command('supplycollateral', (ctx) => {
    const match = ctx.message.text.match(/\/supplycollateral\s+(\d+\.?\d*)\s+(\w+\.?\w*)/);
    if (match && match[1] && match[2]) {
      const amount = match[1];
      const asset = match[2];
      console.log(`Executing supply collateral command with params: amount=${amount}, asset=${asset}`);
      return handleActionCallbacks(ctx, `machfi-supply-collateral ${amount} ${asset}`, agentWithExecuteAction);
    } else {
      return ctx.reply("Please provide the amount and asset. Format: `/supplycollateral <amount> <asset>`\nExample: `/supplycollateral 100 USDC.e`", {
        parse_mode: 'Markdown'
      });
    }
  });

  bot.command('borrow', (ctx) => {
    const match = ctx.message.text.match(/\/borrow\s+(\d+\.?\d*)\s+(\w+\.?\w*)/);
    if (match && match[1] && match[2]) {
      const amount = match[1];
      const asset = match[2];
      console.log(`Executing borrow command with params: amount=${amount}, asset=${asset}`);
      return handleActionCallbacks(ctx, `machfi-borrow ${amount} ${asset}`, agentWithExecuteAction);
    } else {
      return ctx.reply("Please provide the amount and asset. Format: `/borrow <amount> <asset>`\nExample: `/borrow 5 S`", {
        parse_mode: 'Markdown'
      });
    }
  });

  bot.command('repay', (ctx) => {
    const match = ctx.message.text.match(/\/repay\s+(\d+\.?\d*)\s+(\w+\.?\w*)/);
    if (match && match[1] && match[2]) {
      const amount = match[1];
      const asset = match[2];
      console.log(`Executing repay command with params: amount=${amount}, asset=${asset}`);
      return handleActionCallbacks(ctx, `machfi-repay ${amount} ${asset}`, agentWithExecuteAction);
    } else {
      return ctx.reply("Please provide the amount and asset. Format: `/repay <amount> <asset>`\nExample: `/repay 5 S`", {
        parse_mode: 'Markdown'
      });
    }
  });

  // Execute strategy commands
  bot.command('executews', (ctx) => {
    const match = ctx.message.text.match(/\/executews\s+(\d+\.?\d*)/);
    if (match && match[1]) {
      const amount = match[1];
      return handleActionCallbacks(ctx, `execute-ws-strategy ${amount}`, agentWithExecuteAction);
    } else {
      return ctx.reply("Please provide the amount of wS tokens. Format: `/executews <amount>`\nExample: `/executews 5`", {
        parse_mode: 'Markdown'
      });
    }
  });

  bot.command('executeusdce', (ctx) => {
    const match = ctx.message.text.match(/\/executeusdce\s+(\d+\.?\d*)/);
    if (match && match[1]) {
      const amount = match[1];
      return handleActionCallbacks(ctx, `execute-usdce-strategy ${amount}`, agentWithExecuteAction);
    } else {
      return ctx.reply("Please provide the amount of USDC.e tokens. Format: `/executeusdce <amount>`\nExample: `/executeusdce 100`", {
        parse_mode: 'Markdown'
      });
    }
  });
  
  // Delta neutral strategy execution commands
  bot.command('executemachfidelta', (ctx) => {
    const match = ctx.message.text.match(/\/executemachfidelta\s+(\d+\.?\d*)/);
    if (match && match[1]) {
      const amount = match[1];
      console.log(`Executing MachFi delta neutral strategy with amount: ${amount}`);
      return handleActionCallbacks(ctx, `execute-machfi-delta-neutral ${amount}`, agentWithExecuteAction);
    } else {
      return ctx.reply("Please provide the amount of USDC.e to use. Format: `/executemachfidelta <amount>`\nExample: `/executemachfidelta 2`", {
        parse_mode: 'Markdown'
      });
    }
  });
  
  bot.command('executeaavedelta', (ctx) => {
    const match = ctx.message.text.match(/\/executeaavedelta\s+(\d+\.?\d*)/);
    if (match && match[1]) {
      const amount = match[1];
      console.log(`Executing Aave delta neutral strategy with amount: ${amount}`);
      return handleActionCallbacks(ctx, `execute-aave-delta-neutral ${amount}`, agentWithExecuteAction);
    } else {
      return ctx.reply("Please provide the amount of USDC.e to use. Format: `/executeaavedelta <amount>`\nExample: `/executeaavedelta 2`", {
        parse_mode: 'Markdown'
      });
    }
  });
  
  // Special exit command to return to terminal
  bot.command('exit', (ctx) => {
    ctx.reply('Goodbye! Returning to terminal...');
    console.log('Exit command issued by user', ctx.from?.username);
    console.log('Exiting Telegram mode...');
    // Return to terminal (the bot stays running but control returns to parent function)
    // This will be handled by the parent promise in runTelegramMode
    
    // If using the older node-telegram-bot-api, this will trigger the onExit callback
    process.emit('SIGINT');
  });
  
  // Special kill command for development
  bot.command('kill', (ctx) => {
    ctx.reply('Shutting down the application...');
    console.log('Kill command issued by user', ctx.from?.username);
    console.log('Kill command received. Shutting down...');
    // Force exit with 0 status code
    setTimeout(() => process.exit(0), 500);
  });
  
  // Handle callback queries from inline keyboards
  bot.on('callback_query', (ctx) => {
    // Ensure that callback data exists before accessing it
    const callbackData = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    
    if (!callbackData) {
      console.error('Callback query received without data');
      return handleMenu(ctx);
    }
    
    if (config.logCallbacks) {
      console.log('Callback query received:', callbackData);
    }
    
    // Special case for returning to main menu
    if (callbackData === 'action_main_menu') {
      return handleMenu(ctx);
    }
    
    // Special case for delta neutral menu
    if (callbackData === 'action_delta_neutral') {
      return handleDeltaNeutralMenu(ctx);
    }
    
    // Add handlers for menu navigation buttons
    if (callbackData === 'menu_defi_strategies') {
      return ctx.reply('💹 DeFi Strategies\n\nChoose an option:', {
        parse_mode: 'Markdown',
        ...getDefiStrategiesMenuKeyboard()
      });
    }
    
    if (callbackData === 'menu_token_operations') {
      return ctx.reply('🔄 Token Operations\n\nChoose an option:', {
        parse_mode: 'Markdown',
        ...getTokenOperationsMenuKeyboard()
      });
    }
    
    if (callbackData === 'menu_swapx') {
      return ctx.reply('💱 SwapX DEX Integration\n\nChoose an option:', {
        parse_mode: 'Markdown',
        ...getSwapXMenuKeyboard()
      });
    }
    
    // Handle all other actions
    return handleActionCallbacks(ctx, callbackData, agentWithExecuteAction);
  });
  
  // Add a new command handler for SwapX help
  bot.command('swaphelp', (ctx) => {
    const swapHelpMessage = `# 💱 SwapX DEX Integration

Our SwapX DEX integration allows seamless token swapping:

## 📊 Available Commands:

### Basic Token Swaps
- \`/swaps <amount>\` - Swap S to USDC.e
  Example: \`/swaps 5\` to swap 5 S tokens to USDC.e

- \`/swapusdc <amount>\` - Swap USDC.e to S
  Example: \`/swapusdc 10\` to swap 10 USDC.e to S tokens

### Custom Token Swaps
- \`/swapx-swap tokenIn=<token> tokenOut=<token> amount=<amount>\`
  Example: \`/swapx-swap tokenIn=S tokenOut=USDC_E amount=5\`

## 🔍 SwapX Features:
- 🔁 Native S to USDC.e Conversion
- 💯 Smart Slippage Protection
- 🛡️ Balance Verification
- ✅ Automatic Token Approvals
- 🔎 Transaction Tracking`;

    return ctx.reply(swapHelpMessage, {
      parse_mode: 'Markdown',
      ...getSwapXMenuKeyboard()
    });
  });
  
  // Start the bot
  await bot.launch();
  console.log('Telegram bot initialized. Waiting for /start command...');
  
  return bot;
} 