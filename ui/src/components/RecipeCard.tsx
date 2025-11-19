import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, ChefHat, Clock } from 'lucide-react';
import { useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { toast } from 'sonner';
import { useRecipe, useRecipeIngredients, useRecipeSteps } from '@/hooks/useRecipeContract';
import { getFHEVMInstance, decryptEuint32, resetFHEVMInstance, validateNetworkForFHEVM } from '@/lib/fhevm';
import { getContractAddress } from '@/config/contracts';
import { ethers } from 'ethers';

interface RecipeCardProps {
  recipeId: number;
}

const RecipeCard = ({ recipeId }: RecipeCardProps) => {
  const [unlockedIngredients, setUnlockedIngredients] = useState<Map<number, number>>(new Map()); // Map<index, decryptedAmount>
  const [unlockedSteps, setUnlockedSteps] = useState<Set<number>>(new Set());
  const [decrypting, setDecrypting] = useState<Set<number>>(new Set());
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // Fetch recipe data
  const { data: recipe, isLoading: isLoadingRecipe, error: recipeError } = useRecipe(recipeId);
  const { data: ingredientsData, isLoading: isLoadingIngredients } = useRecipeIngredients(recipeId);
  const { data: stepsData, isLoading: isLoadingSteps } = useRecipeSteps(recipeId);

  // Debug logging
  if (recipeError) {
    console.error(`[RecipeCard] Error loading recipe ${recipeId}:`, recipeError);
  }
  if (recipe) {
    console.log(`[RecipeCard] Recipe ${recipeId} loaded:`, {
      title: recipe.title,
      chef: recipe.chef,
      isActive: recipe.isActive,
      isActiveType: typeof recipe.isActive,
      rawData: recipe,
    });
  }

  const handleUnlock = async (type: 'ingredient' | 'step', index: number) => {
    if (!isConnected) {
      toast.error('Please connect your wallet to decrypt');
      return;
    }

    if (!recipe) {
      toast.error('Recipe data not loaded yet. Please wait...');
      return;
    }

    if (!recipe.chef) {
      toast.error('Recipe chef information not available');
      return;
    }

    if (!address) {
      toast.error('Wallet address not available. Please connect your wallet.');
      return;
    }

    // Validate chainId
    if (!chainId) {
      toast.error('Network not detected. Please ensure your wallet is connected.');
      return;
    }

    console.log('[Decrypt] Current chainId:', chainId, 'Type:', typeof chainId);

    const chefAddress = typeof recipe.chef === 'string' ? recipe.chef : String(recipe.chef);
    if (chefAddress.toLowerCase() !== address.toLowerCase()) {
      toast.error('Only the recipe owner can decrypt private data');
      return;
    }

    // Check if already decrypting
    if (decrypting.has(index)) {
      return;
    }

    try {
      setDecrypting(prev => new Set([...prev, index]));

      if (type === 'ingredient') {
        // Check if ingredient is actually encrypted
        console.log('[Decrypt] Checking ingredient encryption status:', {
          index,
          ingredientName: ingredientNames[index],
          isEncrypted: ingredientEncrypted[index],
          ingredientEncryptedArray: ingredientEncrypted,
        });

        if (!ingredientEncrypted[index]) {
          console.log('[Decrypt] Ingredient is not encrypted, skipping decryption');
          toast.info('This ingredient is not encrypted');
          return;
        }

        // Validate network support
        if (!validateNetworkForFHEVM(chainId)) {
          toast.error(`Network not supported for decryption. Please switch to Local or Sepolia.`);
          return;
        }
        
        console.log('[Decrypt] ✅ Ingredient is encrypted, proceeding with decryption...');

        // For localhost network, use Mock decryption (no signature needed)
        if (chainId === 31337) {
          console.log('[Decrypt] Using LOCAL network (31337) - Mock decryption');
          const contractAddress = getContractAddress(chainId);
          if (!contractAddress) {
            throw new Error('Contract address not available');
          }

          // Get encrypted ingredient from contract
          if (typeof window === "undefined" || !(window as any).ethereum) {
            throw new Error("No wallet provider detected");
          }

          const provider = new ethers.BrowserProvider((window as any).ethereum, "any");
          const signer = await provider.getSigner();
          const { ethers: ethersLib } = await import("ethers");
          const { CONTRACT_ABI } = await import('@/config/contracts');
          
          const contract = new ethersLib.Contract(contractAddress, CONTRACT_ABI, signer);
          
          // Get encrypted ingredient amount
          console.log('[Decrypt] 📖 Calling getEncryptedIngredient...', {
            recipeId,
            index,
            contractAddress,
            address,
          });
          
          let encryptedAmount;
          try {
            encryptedAmount = await contract.getEncryptedIngredient(recipeId, index);
            console.log('[Decrypt] ✅ Successfully got encrypted handle from contract');
            console.log('[Decrypt] Encrypted handle (raw):', encryptedAmount);
            console.log('[Decrypt] Encrypted handle type:', typeof encryptedAmount);
          } catch (error: any) {
            console.error('[Decrypt] ❌ Failed to get encrypted ingredient from contract:', error);
            throw new Error(
              `Failed to get encrypted ingredient from contract: ${error.message || 'Unknown error'}. ` +
              `Please ensure: 1) You are the recipe owner, 2) The ingredient is encrypted, 3) The ingredient index is valid.`
            );
          }

          // Convert handle to correct format (bytes32)
          console.log('[Decrypt] Converting handle to bytes32 format...');
          let handleToDecrypt: string;
          
          if (typeof encryptedAmount === "bigint") {
            handleToDecrypt = "0x" + encryptedAmount.toString(16).padStart(64, '0');
          } else if (typeof encryptedAmount === "string") {
            if (encryptedAmount.startsWith("0x")) {
              const hexPart = encryptedAmount.slice(2);
              handleToDecrypt = "0x" + hexPart.padStart(64, '0');
            } else {
              // Assume it's a hex string without 0x prefix
              handleToDecrypt = "0x" + encryptedAmount.padStart(64, '0');
            }
          } else {
            // Try to convert to string first
            const str = String(encryptedAmount);
            if (str.startsWith("0x")) {
              const hexPart = str.slice(2);
              handleToDecrypt = "0x" + hexPart.padStart(64, '0');
            } else {
              handleToDecrypt = "0x" + str.padStart(64, '0');
            }
          }

          // Validate handle format
          if (handleToDecrypt.length !== 66) {
            console.error('[Decrypt] Invalid handle format:', {
              handle: handleToDecrypt,
              length: handleToDecrypt.length,
              expectedLength: 66,
              originalValue: encryptedAmount,
              originalType: typeof encryptedAmount,
            });
            throw new Error(
              `Invalid handle format: ${handleToDecrypt} (length: ${handleToDecrypt.length}, expected: 66). ` +
              `Original value: ${encryptedAmount}, type: ${typeof encryptedAmount}`
            );
          }

          console.log('[Decrypt] 🔓 Using decryptEuint32() for local network → ✅ 直接显示（无需签名）');
          console.log('[Decrypt] Formatted handle:', handleToDecrypt);

          // Reset FHEVM instance to ensure no cached Sepolia instance interferes
          console.log('[Decrypt] Resetting FHEVM instance before decryption...');
          resetFHEVMInstance();

          // Use decryptEuint32 which properly handles local network
          // It will create Mock FHEVM instance and use userDecryptHandleBytes32 internally
          console.log('[Decrypt] Calling decryptEuint32 with chainId:', chainId);
          
          let decryptedValue;
          try {
            // Get Mock FHEVM instance first (decryptEuint32 needs it even for local network)
            const mockFhevm = await getFHEVMInstance(chainId);
            console.log('[Decrypt] Mock FHEVM instance obtained:', {
              hasGenerateKeypair: mockFhevm && typeof mockFhevm.generateKeypair === 'function',
              constructor: mockFhevm?.constructor?.name,
            });
            
            // Call decryptEuint32 with Mock instance
            // For local network, it will ignore the fhevm parameter and use userDecryptHandleBytes32 directly
            decryptedValue = await decryptEuint32(
              mockFhevm,
              handleToDecrypt,
              contractAddress,
              address,
              signer,
              chainId
            );
            console.log('[Decrypt] ✅ decryptEuint32 returned:', decryptedValue);
          } catch (error: any) {
            console.error('[Decrypt] ❌ decryptEuint32 failed:', error);
            console.error('[Decrypt] Error stack:', error.stack);
            throw new Error(
              `Decryption failed: ${error.message || 'Unknown error'}. ` +
              `Please ensure: 1) Hardhat node is running, 2) FHEVM plugin is enabled, 3) The handle is valid.`
            );
          }

          // Convert back from integer (divide by 10 to get original decimal value)
          const actualAmount = decryptedValue / 10;
          console.log('[Decrypt] ✅ Decrypted amount:', actualAmount);
          console.log('[Decrypt] ✅ 直接显示（无需签名）');

          setUnlockedIngredients(prev => {
            const next = new Map(prev);
            next.set(index, actualAmount);
            return next;
          });
          toast.success(`✅ Decrypted: ${actualAmount}`);
        } else {
          // For Sepolia network, use FHEVM with signature
          console.log('[Decrypt] ChainId is NOT 31337, checking if Sepolia...', chainId);
          
          // Validate chainId first
          if (chainId !== 11155111) {
            const errorMsg = `Unsupported network for decryption. ` +
              `Current Chain ID: ${chainId || 'undefined'}. ` +
              `Supported networks: Local (31337) or Sepolia (11155111). ` +
              `Please switch to a supported network.`;
            console.error('[Decrypt]', errorMsg);
            toast.error(errorMsg);
            throw new Error(errorMsg);
          }

          console.log('[Decrypt] Using SEPOLIA network (11155111) - FHEVM decryption with signature');

          const contractAddress = getContractAddress(chainId);
          if (!contractAddress) {
            throw new Error('Contract address not available');
          }

          if (typeof window === "undefined" || !(window as any).ethereum) {
            throw new Error("No wallet provider detected");
          }

          const provider = new ethers.BrowserProvider((window as any).ethereum, "any");
          const signer = await provider.getSigner();
          const { ethers: ethersLib } = await import("ethers");
          const { CONTRACT_ABI } = await import('@/config/contracts');
          
          const contract = new ethersLib.Contract(contractAddress, CONTRACT_ABI, signer);
          const encryptedAmount = await contract.getEncryptedIngredient(recipeId, index);
          
          let handleToDecrypt = String(encryptedAmount);
          if (!handleToDecrypt.startsWith("0x")) {
            if (typeof encryptedAmount === "bigint") {
              handleToDecrypt = "0x" + encryptedAmount.toString(16).padStart(64, '0');
            } else {
              handleToDecrypt = "0x" + String(encryptedAmount).padStart(64, '0');
            }
          } else if (handleToDecrypt.length !== 66) {
            const hexPart = handleToDecrypt.slice(2);
            handleToDecrypt = "0x" + hexPart.padStart(64, '0');
          }

          console.log('[Decrypt] 🔓 Using Sepolia FHEVM decryption with signature...');
          const fhevm = await getFHEVMInstance(chainId);
          
          // Verify fhevm instance has generateKeypair method (Sepolia instance)
          if (!fhevm || typeof fhevm.generateKeypair !== 'function') {
            throw new Error(
              `Invalid FHEVM instance for Sepolia network. ` +
              `Please ensure you're connected to Sepolia network (Chain ID: 11155111) ` +
              `and FHEVM SDK is properly initialized.`
            );
          }

          const decryptedAmount = await decryptEuint32(
            fhevm,
            handleToDecrypt,
            contractAddress,
            address,
            signer,
            chainId
          );

          const actualAmount = decryptedAmount / 10;
          setUnlockedIngredients(prev => {
            const next = new Map(prev);
            next.set(index, actualAmount);
            return next;
          });
          toast.success(`✅ Decrypted: ${actualAmount}`);
        }
      } else {
        // Steps are already in plain text, just mark as unlocked
        setUnlockedSteps(prev => new Set([...prev, index]));
        toast.success('Step unlocked successfully!');
      }
    } catch (error: any) {
      console.error('[Decrypt] Error:', error);
      toast.error(`Failed to decrypt: ${error.message || 'Unknown error'}`);
    } finally {
      setDecrypting(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  // Show loading state
  if (isLoadingRecipe || isLoadingIngredients || isLoadingSteps) {
    return (
      <Card className="shadow-card hover:shadow-card-hover transition-shadow">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (recipeError) {
    return (
      <Card className="shadow-card hover:shadow-card-hover transition-shadow">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Error loading recipe #{recipeId}</p>
            <p className="text-xs mt-1">{String(recipeError.message || recipeError)}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show empty state if recipe doesn't exist
  if (!recipe) {
    return (
      <Card className="shadow-card hover:shadow-card-hover transition-shadow">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Recipe #{recipeId} not found</p>
            <p className="text-xs mt-1">This recipe may have been deleted or doesn't exist</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if recipe is active
  // Handle both boolean and undefined cases
  const isActive = recipe.isActive !== undefined ? Boolean(recipe.isActive) : true;
  
  if (!isActive) {
    console.log(`[RecipeCard] Recipe ${recipeId} is marked as inactive`);
    return (
      <Card className="shadow-card hover:shadow-card-hover transition-shadow opacity-60">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Recipe #{recipeId} has been deleted</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Safely extract ingredients and steps data
  // Contract returns [string[], bool[]] tuple
  const ingredientNames = (ingredientsData && Array.isArray(ingredientsData) && ingredientsData[0]) 
    ? ingredientsData[0] as string[]
    : [];
  const ingredientEncrypted = (ingredientsData && Array.isArray(ingredientsData) && ingredientsData[1])
    ? ingredientsData[1] as boolean[]
    : [];
  
  // Debug: Log ingredient encryption status
  if (ingredientsData) {
    console.log(`[RecipeCard ${recipeId}] Ingredients data:`, {
      rawData: ingredientsData,
      names: ingredientNames,
      encrypted: ingredientEncrypted,
      namesLength: ingredientNames.length,
      encryptedLength: ingredientEncrypted.length,
    });
  }
  
  const stepDescriptions = (stepsData && Array.isArray(stepsData) && stepsData[0])
    ? stepsData[0] as string[]
    : [];
  const stepEncrypted = (stepsData && Array.isArray(stepsData) && stepsData[1])
    ? stepsData[1] as boolean[]
    : [];

  return (
    <Card className="shadow-card hover:shadow-card-hover transition-shadow w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl truncate">{recipe.title || 'Untitled Recipe'}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">{recipe.description || 'No description'}</CardDescription>
          </div>
          <ChefHat className="h-6 w-6 text-accent flex-shrink-0 ml-2" />
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
          <div className="flex items-center gap-1">
            <ChefHat className="h-4 w-4" />
            <span className="font-mono text-xs">
              {recipe.chef && typeof recipe.chef === 'string' 
                ? `${recipe.chef.slice(0, 6)}...${recipe.chef.slice(-4)}`
                : 'Unknown Chef'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{recipe.prepTime || 'N/A'}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2 text-sm">Ingredients:</h4>
          {ingredientNames.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ingredients listed</p>
          ) : (
            <ul className="space-y-2">
              {ingredientNames.map((name, index) => {
                const isEncrypted = ingredientEncrypted[index];
                const isUnlocked = unlockedIngredients.has(index);
                const decryptedAmount = unlockedIngredients.get(index);
                const isDecrypting = decrypting.has(index);

                return (
                  <li key={index} className="flex items-center justify-between text-sm">
                    {isEncrypted && !isUnlocked ? (
                      <>
                        <div className="flex items-center gap-2 flex-1">
                          <Lock className="h-4 w-4 text-locked-foreground" />
                          <span className="text-locked-foreground">••••••••</span>
                          <Badge variant="secondary" className="text-xs">Encrypted</Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUnlock('ingredient', index)}
                          disabled={isDecrypting}
                          className="ml-2"
                        >
                          {isDecrypting ? (
                            <span className="text-xs">...</span>
                          ) : (
                            <Unlock className="h-4 w-4" />
                          )}
                        </Button>
                      </>
                    ) : (
                      <span className="text-foreground">
                        {isEncrypted && isUnlocked && decryptedAmount !== undefined ? (
                          <span className="flex items-center gap-2">
                            <span className="font-semibold text-green-600">{decryptedAmount}</span>
                            <span>{name}</span>
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                              ✅ DECRYPTED
                            </Badge>
                          </span>
                        ) : (
                          name
                        )}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div>
          <h4 className="font-semibold mb-2 text-sm">Preparation Steps:</h4>
          {stepDescriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No steps listed</p>
          ) : (
            <ol className="space-y-3 list-decimal list-inside">
              {stepDescriptions.map((step, index) => (
              <li key={index} className="text-sm">
                {stepEncrypted[index] && !unlockedSteps.has(index) ? (
                  <div className="inline-flex items-center gap-2 ml-2">
                    <Lock className="h-4 w-4 text-locked-foreground" />
                    <span className="text-locked-foreground">••••••••••••••</span>
                    <Badge variant="secondary" className="text-xs">Secret Step</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUnlock('step', index)}
                      disabled={decrypting.has(index)}
                    >
                      {decrypting.has(index) ? (
                        <span className="text-xs">...</span>
                      ) : (
                        <Unlock className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ) : (
                  <span className="ml-2 text-foreground">
                    {stepEncrypted[index] && unlockedSteps.has(index)
                      ? `[UNLOCKED] ${step}`
                      : step
                    }
                  </span>
                )}
              </li>
              ))}
            </ol>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="default" className="w-full">
          Share Recipe
        </Button>
      </CardFooter>
    </Card>
  );
};

export default RecipeCard;
