import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, ChefHat, Clock, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useRecipe, useRecipeIngredients, useRecipeSteps } from '@/hooks/useRecipeContract';
import { getFHEVMInstance, decryptEuint32, resetFHEVMInstance, validateNetworkForFHEVM } from '@/lib/fhevm';
import { getContractAddress } from '@/config/contracts';
import { ethers } from 'ethers';
import DecryptionEffect from './DecryptionEffect';

interface RecipeCardProps {
  recipeId: number;
}

const RecipeCard = ({ recipeId }: RecipeCardProps) => {
  const [unlockedIngredients, setUnlockedIngredients] = useState<Map<number, number>>(new Map());
  const [unlockedSteps, setUnlockedSteps] = useState<Set<number>>(new Set());
  const [decrypting, setDecrypting] = useState<Set<number>>(new Set());
  const [showCelebration, setShowCelebration] = useState(false);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const { data: recipe, isLoading: isLoadingRecipe, error: recipeError } = useRecipe(recipeId);
  const { data: ingredientsData, isLoading: isLoadingIngredients } = useRecipeIngredients(recipeId);
  const { data: stepsData, isLoading: isLoadingSteps } = useRecipeSteps(recipeId);

  const handleUnlock = async (type: 'ingredient' | 'step', index: number) => {
    if (!isConnected) {
      toast.error('Please connect your wallet to decrypt');
      return;
    }

    if (!recipe || !recipe.chef || !address) {
      toast.error('Recipe data not loaded yet');
      return;
    }

    const chefAddress = typeof recipe.chef === 'string' ? recipe.chef : String(recipe.chef);
    if (chefAddress.toLowerCase() !== address.toLowerCase()) {
      toast.error('Only the recipe owner can decrypt private data');
      return;
    }

    if (decrypting.has(index)) return;

    try {
      setDecrypting(prev => new Set([...prev, index]));

      if (type === 'ingredient') {
        if (!ingredientEncrypted[index]) {
          toast.info('This ingredient is not encrypted');
          return;
        }

        if (!validateNetworkForFHEVM(chainId)) {
          toast.error('Network not supported for decryption');
          return;
        }

        const contractAddress = getContractAddress(chainId);
        if (!contractAddress) throw new Error('Contract address not available');

        if (typeof window === "undefined" || !(window as any).ethereum) {
          throw new Error("No wallet provider detected");
        }

        const provider = new ethers.BrowserProvider((window as any).ethereum, "any");
        const signer = await provider.getSigner();
        const { ethers: ethersLib } = await import("ethers");
        const { CONTRACT_ABI } = await import('@/config/contracts');
        
        const contract = new ethersLib.Contract(contractAddress, CONTRACT_ABI, signer);
        const encryptedAmount = await contract.getEncryptedIngredient(recipeId, index);

        let handleToDecrypt: string;
        if (typeof encryptedAmount === "bigint") {
          handleToDecrypt = "0x" + encryptedAmount.toString(16).padStart(64, '0');
        } else if (typeof encryptedAmount === "string") {
          handleToDecrypt = encryptedAmount.startsWith("0x") 
            ? "0x" + encryptedAmount.slice(2).padStart(64, '0')
            : "0x" + encryptedAmount.padStart(64, '0');
        } else {
          const str = String(encryptedAmount);
          handleToDecrypt = str.startsWith("0x")
            ? "0x" + str.slice(2).padStart(64, '0')
            : "0x" + str.padStart(64, '0');
        }

        resetFHEVMInstance();
        const fhevm = await getFHEVMInstance(chainId);
        
        const decryptedValue = await decryptEuint32(
          fhevm,
          handleToDecrypt,
          contractAddress,
          address,
          signer,
          chainId
        );

        const actualAmount = decryptedValue / 10;

        setUnlockedIngredients(prev => {
          const next = new Map(prev);
          next.set(index, actualAmount);
          return next;
        });

        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 2000);
        
        toast.success(`Decrypted: ${actualAmount}`);
      } else {
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

  if (isLoadingRecipe || isLoadingIngredients || isLoadingSteps) {
    return (
      <Card className="shadow-card hover:shadow-card-hover transition-all duration-300">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recipeError || !recipe) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6 text-center text-muted-foreground">
          <p className="text-sm">Error loading recipe #{recipeId}</p>
        </CardContent>
      </Card>
    );
  }

  const isActive = recipe.isActive !== undefined ? Boolean(recipe.isActive) : true;
  if (!isActive) {
    return (
      <Card className="shadow-card opacity-60">
        <CardContent className="p-6 text-center text-muted-foreground">
          <p className="text-sm">Recipe #{recipeId} has been deleted</p>
        </CardContent>
      </Card>
    );
  }

  const ingredientNames = (ingredientsData?.[0] || []) as string[];
  const ingredientEncrypted = (ingredientsData?.[1] || []) as boolean[];
  const stepDescriptions = (stepsData?.[0] || []) as string[];
  const stepEncrypted = (stepsData?.[1] || []) as boolean[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative"
    >
      {/* Celebration overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 pointer-events-none"
          >
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: '50%',
                  y: '50%',
                  scale: 0,
                }}
                animate={{
                  x: `${50 + (Math.random() - 0.5) * 100}%`,
                  y: `${50 + (Math.random() - 0.5) * 100}%`,
                  scale: [0, 1, 0],
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 1,
                  delay: i * 0.05,
                }}
                className="absolute"
              >
                <Sparkles className="h-4 w-4 text-warning" />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden group">
        <CardHeader className="relative">
          <div className="absolute top-0 left-0 right-0 h-1 gradient-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl truncate">{recipe.title || 'Untitled Recipe'}</CardTitle>
              <CardDescription className="mt-1 line-clamp-2">{recipe.description || 'No description'}</CardDescription>
            </div>
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <ChefHat className="h-6 w-6 text-primary flex-shrink-0 ml-2" />
            </motion.div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
            <div className="flex items-center gap-1">
              <ChefHat className="h-4 w-4" />
              <span className="font-mono text-xs">
                {recipe.chef ? `${recipe.chef.slice(0, 6)}...${recipe.chef.slice(-4)}` : 'Unknown'}
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
                    <motion.li
                      key={index}
                      layout
                      className="flex items-center justify-between text-sm"
                    >
                      {isEncrypted && !isUnlocked ? (
                        <>
                          <div className="flex items-center gap-2 flex-1">
                            <DecryptionEffect
                              isDecrypting={isDecrypting}
                              isDecrypted={false}
                              decryptedValue={undefined}
                            >
                              <div className="flex items-center gap-2">
                                <Lock className="h-4 w-4 text-locked-foreground" />
                                <span className="text-locked-foreground font-mono">********</span>
                                <Badge variant="secondary" className="text-xs">Encrypted</Badge>
                              </div>
                            </DecryptionEffect>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUnlock('ingredient', index)}
                            disabled={isDecrypting}
                            className="ml-2 hover:bg-primary/10"
                          >
                            {isDecrypting ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              >
                                <Lock className="h-4 w-4" />
                              </motion.div>
                            ) : (
                              <Unlock className="h-4 w-4" />
                            )}
                          </Button>
                        </>
                      ) : (
                        <motion.span
                          initial={isUnlocked ? { scale: 0.8, opacity: 0 } : false}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-foreground"
                        >
                          {isEncrypted && isUnlocked && decryptedAmount !== undefined ? (
                            <span className="flex items-center gap-2">
                              <motion.span
                                initial={{ scale: 1.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="font-bold text-success"
                              >
                                {decryptedAmount}
                              </motion.span>
                              <span>{name}</span>
                              <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                                DECRYPTED
                              </Badge>
                            </span>
                          ) : (
                            name
                          )}
                        </motion.span>
                      )}
                    </motion.li>
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
                  <motion.li key={index} layout className="text-sm">
                    {stepEncrypted[index] && !unlockedSteps.has(index) ? (
                      <div className="inline-flex items-center gap-2 ml-2">
                        <Lock className="h-4 w-4 text-locked-foreground" />
                        <span className="text-locked-foreground font-mono">**************</span>
                        <Badge variant="secondary" className="text-xs">Secret Step</Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUnlock('step', index)}
                          disabled={decrypting.has(index)}
                        >
                          <Unlock className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className="ml-2 text-foreground">
                        {stepEncrypted[index] && unlockedSteps.has(index) ? (
                          <motion.span
                            initial={{ opacity: 0, filter: "blur(10px)" }}
                            animate={{ opacity: 1, filter: "blur(0px)" }}
                            className="text-success"
                          >
                            [UNLOCKED] {step}
                          </motion.span>
                        ) : (
                          step
                        )}
                      </span>
                    )}
                  </motion.li>
                ))}
              </ol>
            )}
          </div>
        </CardContent>

        <CardFooter>
          <Button variant="default" className="w-full gradient-primary text-white">
            Share Recipe
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default RecipeCard;
