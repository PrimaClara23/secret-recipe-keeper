// Import factory - Vite will handle the ethers dependency resolution
import { EncryptedRecipeKeeper__factory } from "../../../types/factories/contracts/EncryptedRecipeKeeper__factory";

// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  // Local development (hardhat)
  31337: "0x5FbDB2315678afecb367f032d93F642f64180aa3",

  // Sepolia testnet (update after deployment)
  11155111: "",
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
