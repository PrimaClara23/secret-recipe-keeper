import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import RecipeCard from '@/components/RecipeCard';
import { useRecipeCount, useContractAddress } from '@/hooks/useRecipeContract';
import { useAccount, useChainId } from 'wagmi';
import { useState, useMemo } from 'react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const RecipesPage = () => {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const contractAddress = useContractAddress();
  const { data: recipeCount, isLoading: isLoadingCount, error: countError } = useRecipeCount();
  const [searchQuery, setSearchQuery] = useState('');

  const recipeIds = useMemo(() => {
    if (!recipeCount) return [];
    return Array.from({ length: Number(recipeCount) }, (_, i) => i);
  }, [recipeCount]);

  return (
    <PageTransition>
      <div className="container py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Recipe Vault</h1>
                <p className="text-muted-foreground mt-1">
                  Browse all encrypted recipes stored on the blockchain
                </p>
                {isConnected && contractAddress && (
                  <p className="text-xs font-mono text-muted-foreground mt-2">
                    Contract: {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)} (Chain: {chainId})
                  </p>
                )}
              </div>

              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search recipes..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </motion.div>

          {/* Content */}
          {!isConnected ? (
            <motion.div
              variants={itemVariants}
              className="text-center py-16 rounded-lg border border-dashed border-border"
            >
              <p className="text-lg text-muted-foreground mb-2">
                Connect your wallet to view recipes
              </p>
              <p className="text-sm text-muted-foreground">
                Secure your culinary secrets with blockchain encryption
              </p>
            </motion.div>
          ) : isLoadingCount ? (
            <motion.div
              variants={itemVariants}
              className="text-center py-16"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="inline-block mb-4"
              >
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
              </motion.div>
              <p className="text-muted-foreground">Loading recipes from blockchain...</p>
            </motion.div>
          ) : countError ? (
            <motion.div
              variants={itemVariants}
              className="text-center py-16 rounded-lg border border-destructive/30 bg-destructive/5"
            >
              <p className="text-lg text-destructive mb-2">Error loading recipes</p>
              <p className="text-sm text-muted-foreground">
                Make sure you're connected to the correct network
              </p>
            </motion.div>
          ) : recipeIds.length === 0 ? (
            <motion.div
              variants={itemVariants}
              className="text-center py-16 rounded-lg border border-dashed border-border"
            >
              <p className="text-lg text-muted-foreground mb-2">No recipes found</p>
              <p className="text-sm text-muted-foreground">
                Be the first to share your encrypted recipe!
              </p>
            </motion.div>
          ) : (
            <motion.div
              variants={containerVariants}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {recipeIds.map((recipeId) => (
                <motion.div key={recipeId} variants={itemVariants}>
                  <RecipeCard recipeId={recipeId} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default RecipesPage;
