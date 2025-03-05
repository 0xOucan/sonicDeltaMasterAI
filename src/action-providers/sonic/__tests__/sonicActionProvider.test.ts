import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createPublicClient } from 'viem';
import { SonicActionProvider } from '../sonicActionProvider';
import { SonicSwapError, InsufficientLiquidityError } from '../errors';
import { SONIC_ROUTER_ADDRESS, ODOS_ROUTER_ADDRESS } from '../constants';
import type { Hex } from 'viem';
import type { EvmWalletProvider } from "@coinbase/agentkit"; 

// Mock viem
jest.mock('viem', () => ({
  createPublicClient: jest.fn(),
  encodeFunctionData: jest.fn(),
  http: jest.fn()
}));

describe('SonicActionProvider', () => {
  let provider: SonicActionProvider;
  let mockWalletProvider: any;

    beforeEach(() => {
        provider = new SonicActionProvider();

        // Mock wallet provider
        mockWalletProvider = {
            getAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901111111111' as Hex),
            sendTransaction: jest.fn().mockResolvedValue('0x1234567890123456789012345678901222222222' as Hex),
            waitForTransactionReceipt: jest.fn().mockResolvedValue({}),
            getNetwork: jest.fn().mockResolvedValue({ chainId: '146' })
        } as unknown as EvmWalletProvider;

        // Reset all mocks
        jest.clearAllMocks();
    });

  describe('handleSonicSwap', () => {
    it('should execute a successful swap', async () => {
      // Mock getAmountsOut response
      (createPublicClient as jest.Mock).mockReturnValue({
        readContract: jest.fn().mockResolvedValue([
          BigInt(1000000), // amount in
          BigInt(500000)   // expected amount out
        ])
      });

      const result = await provider['handleSonicSwap'](
        mockWalletProvider,
        '0xtoken1',
        '0xtoken2',
        BigInt(1000000),
        0.5
      );

      // Verify approvals and transactions
      expect(mockWalletProvider.sendTransaction).toHaveBeenCalledTimes(2);
      expect(mockWalletProvider.sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '0xtoken1',
          data: expect.any(String) // approve data
        })
      );
      expect(mockWalletProvider.sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          to: SONIC_ROUTER_ADDRESS,
          data: expect.any(String) // swap data
        })
      );

      expect(result).toBe('0xtx...');
    });

    it('should handle insufficient liquidity', async () => {
      (createPublicClient as jest.Mock).mockReturnValue({
        readContract: jest.fn().mockRejectedValue(new Error('INSUFFICIENT_LIQUIDITY'))
      });

      await expect(
        provider['handleSonicSwap'](
          mockWalletProvider,
          '0xtoken1',
          '0xtoken2',
          BigInt(1000000),
          0.5
        )
      ).rejects.toThrow(InsufficientLiquidityError);
    });
  });

  describe('handleOdosSwap', () => {
    it.only('should execute a successful ODOS swap', async () => {
      const result = await provider['handleOdosSwap'](
        mockWalletProvider,
        '0xtoken1',
        '0xtoken2',
        BigInt(1000000)
      );

      expect(mockWalletProvider.sendTransaction).toHaveBeenCalledTimes(2);
      expect(mockWalletProvider.sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '0xtoken1',
          data: expect.any(String) // approve data
        })
      );
      expect(mockWalletProvider.sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ODOS_ROUTER_ADDRESS,
          data: expect.any(String) // swap data
        })
      );

      expect(result).toBe('0xtx...');
    });

    it('should handle ODOS API errors', async () => {
      mockWalletProvider.sendTransaction.mockRejectedValueOnce(new Error('ODOS API Error'));

      await expect(
        provider['handleOdosSwap'](
          mockWalletProvider,
          '0xtoken1',
          '0xtoken2',
          BigInt(1000000)
        )
      ).rejects.toThrow('ODOS API Error');
    });
  });

  describe('checkWSBalance', () => {
    it('should pass when balance is sufficient', async () => {
      (createPublicClient as jest.Mock).mockReturnValue({
        readContract: jest.fn().mockResolvedValue(BigInt(2000000)) // More than amount needed
      });

      await expect(
        provider['checkWSBalance'](mockWalletProvider, '1000000')
      ).resolves.not.toThrow();
    });

    it('should throw when balance is insufficient', async () => {
      (createPublicClient as jest.Mock).mockReturnValue({
        readContract: jest.fn().mockResolvedValue(BigInt(500000)) // Less than amount needed
      });

      await expect(
        provider['checkWSBalance'](mockWalletProvider, '1000000')
      ).rejects.toThrow('Insufficient balance');
    });

    it('should handle invalid addresses', async () => {
      mockWalletProvider.getAddress.mockResolvedValueOnce('invalid-address');

      await expect(
        provider['checkWSBalance'](mockWalletProvider, '1000000')
      ).rejects.toThrow('Invalid wallet address');
    });
  });

  describe('swap', () => {
    it('should execute Sonic swap by default', async () => {
      const swapSpy = jest.spyOn(provider as any, 'handleSonicSwap');
      
      await provider.swap(mockWalletProvider, {
        tokenIn: '0xtoken1',
        tokenOut: '0xtoken2',
        amountIn: '1000000'
      });

      expect(swapSpy).toHaveBeenCalled();
    });

    it('should execute ODOS swap when specified', async () => {
      const swapSpy = jest.spyOn(provider as any, 'handleOdosSwap');
      
      await provider.swap(mockWalletProvider, {
        tokenIn: '0xtoken1',
        tokenOut: '0xtoken2',
        amountIn: '1000000',
        useOdos: true
      });

      expect(swapSpy).toHaveBeenCalled();
    });
  });
}); 