import { useContractRead, useAccount, useChainId } from 'wagmi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getContractAddress, CONTRACT_ABI } from '../config/contracts';
import { getFHEVMInstance, encryptInput } from '../lib/fhevm';
import { toast } from 'sonner';

export interface Recipe {
  chef: string;
  title: string;
  description: string;
  prepTime: string;
  timestamp: number;
  isActive: boolean;
}

export interface Ingredient {
  name: string;
  amount?: number;
  isEncrypted: boolean;
}

export interface RecipeStep {
  description: string;
  isEncrypted: boolean;
}

// Hook to get contract address
export const useContractAddress = () => {
  const chainId = useChainId();
  try {
    const address = getContractAddress(chainId);
    return address;
  } catch (error: any) {
    console.error('[useContractAddress] Error:', error);
    return null;
  }
};

// Hook to get recipe count
export const useRecipeCount = () => {
  const contractAddress = useContractAddress();

  return useContractRead({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getRecipeCount',
    enabled: !!contractAddress,
  });
};

// Hook to get contract statistics
export const useContractStats = () => {
  const contractAddress = useContractAddress();

  return useContractRead({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getContractStats',
    enabled: !!contractAddress,
  });
};

// Hook to get user recipe count
export const useUserRecipeCount = (userAddress?: string) => {
  const { address } = useAccount();
  const contractAddress = useContractAddress();
  const targetAddress = userAddress || address;

  return useContractRead({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getUserRecipeCount',
    args: targetAddress ? [targetAddress] : undefined,
    enabled: !!contractAddress && !!targetAddress,
  });
};

// Hook to get user recipes
export const useUserRecipes = (userAddress?: string) => {
  const { address } = useAccount();
  const contractAddress = useContractAddress();
  const targetAddress = userAddress || address;

  return useContractRead({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getUserRecipes',
    args: targetAddress ? [targetAddress] : undefined,
    enabled: !!contractAddress && !!targetAddress,
  });
};

// Hook to get recipe details
export const useRecipe = (recipeId: number) => {
  const contractAddress = useContractAddress();

  const result = useContractRead({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getRecipe',
    args: [recipeId],
    enabled: !!contractAddress && recipeId >= 0,
  });

  const transformedData = result.data ? {
    chef: String(result.data[0] || ''),
    title: String(result.data[1] || ''),
    description: String(result.data[2] || ''),
    prepTime: String(result.data[3] || ''),
    timestamp: Number(result.data[4] || 0),
    isActive: result.data[5] === true || result.data[5] === 1 || String(result.data[5]).toLowerCase() === 'true',
  } as Recipe : undefined;

  return {
    ...result,
    data: transformedData,
  };
};

// Hook to get recipe ingredients
export const useRecipeIngredients = (recipeId: number) => {
  const contractAddress = useContractAddress();

  const result = useContractRead({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getRecipeIngredients',
    args: [recipeId],
    enabled: !!contractAddress && recipeId >= 0,
  });

  const transformedData = result.data ? [
    result.data[0] as string[],
    result.data[1] as boolean[],
  ] as [string[], boolean[]] : undefined;

  return {
    ...result,
    data: transformedData,
  };
};

// Hook to get recipe steps
export const useRecipeSteps = (recipeId: number) => {
  const contractAddress = useContractAddress();

  const result = useContractRead({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getRecipeSteps',
    args: [recipeId],
    enabled: !!contractAddress && recipeId >= 0,
  });

  const transformedData = result.data ? [
    result.data[0] as string[],
    result.data[1] as boolean[],
  ] as [string[], boolean[]] : undefined;

  return {
    ...result,
    data: transformedData,
  };
};

// Hook to submit recipe
export const useSubmitRecipe = () => {
  const contractAddress = useContractAddress();
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const chainId = useChainId();

  return useMutation({
    mutationFn: async (params: {
      title: string;
      description: string;
      prepTime: string;
      ingredientNames: string[];
      ingredientAmounts: string[];
      encryptedIngredientIndices: number[];
      stepDescriptions: string[];
      encryptedStepIndices: number[];
    }) => {
      if (!contractAddress) throw new Error('Contract not available');
      if (!address) throw new Error('Wallet not connected');

      const fhevm = await getFHEVMInstance(chainId);

      const encryptedAmounts: `0x${string}`[] = [];
      const amountProofs: `0x${string}`[] = [];

      for (let i = 0; i < params.ingredientNames.length; i++) {
        if (params.encryptedIngredientIndices.includes(i)) {
          const amountStr = params.ingredientAmounts[i] || '0';
          const amount = Math.round(parseFloat(amountStr) * 10);
          
          const encrypted = await encryptInput(fhevm, contractAddress, address, amount);
          encryptedAmounts.push(encrypted.handles[0] as `0x${string}`);
          amountProofs.push(encrypted.inputProof as `0x${string}`);
        }
      }

      if (typeof window === "undefined" || !(window as any).ethereum) {
        throw new Error("No wallet provider detected");
      }

      const ethereum = (window as any).ethereum;
      const { ethers } = await import("ethers");
      
      const provider = new ethers.BrowserProvider(ethereum, "any");
      
      const accounts = await provider.listAccounts();
      if (accounts.length === 0) {
        await provider.send("eth_requestAccounts", []);
      }
      
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);

      const network = await provider.getNetwork();
      const isLocalhost = network.chainId === 31337n;

      let tx;
      if (isLocalhost) {
        tx = await contract.submitRecipe(
          params.title,
          params.description,
          params.prepTime,
          params.ingredientNames,
          encryptedAmounts,
          amountProofs,
          params.encryptedIngredientIndices,
          params.stepDescriptions,
          params.encryptedStepIndices,
          { gasLimit: 5000000n }
        );
      } else {
        tx = await contract.submitRecipe(
          params.title,
          params.description,
          params.prepTime,
          params.ingredientNames,
          encryptedAmounts,
          amountProofs,
          params.encryptedIngredientIndices,
          params.stepDescriptions,
          params.encryptedStepIndices
        );
      }

      const receipt = await tx.wait();
      return receipt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipeCount'] });
      queryClient.invalidateQueries({ queryKey: ['userRecipes'] });
      queryClient.invalidateQueries({ queryKey: ['contractStats'] });
      toast.success('Recipe submitted successfully!');
    },
    onError: (error) => {
      console.error('[Recipe] Submission error:', error);
      toast.error(`Failed to submit recipe: ${error.message}`);
    },
  });
};

// Hook to decrypt ingredient
export const useDecryptIngredient = () => {
  const contractAddress = useContractAddress();

  return useContractRead({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getEncryptedIngredient',
    enabled: false,
  });
};
