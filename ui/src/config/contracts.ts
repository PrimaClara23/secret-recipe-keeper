// Import factory - Vite will handle the ethers dependency resolution
// Path is relative to ui/src/config, going up to project root to access types
import { EncryptedRecipeKeeper__factory } from '../../../types/factories/contracts/EncryptedRecipeKeeper__factory';

// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  // Local development (hardhat)
  31337: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',

  // Sepolia testnet (will be updated after deployment)
  11155111: '', // To be filled after sepolia deployment
} as const;

// Contract factory for deployment
export const getContractFactory = () => EncryptedRecipeKeeper__factory;

// Get contract address for current chain
export const getContractAddress = (chainId: number): string => {
  const address = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  if (!address) {
    throw new Error(`Contract not deployed on chain ${chainId}`);
  }
  return address;
};

// Contract ABI - extract from factory
export const CONTRACT_ABI = EncryptedRecipeKeeper__factory.abi;
