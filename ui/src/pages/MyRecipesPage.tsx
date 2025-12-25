import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PageTransition from '@/components/PageTransition';
import RecipeCard from '@/components/RecipeCard';
import { useUserRecipes, useUserRecipeCount } from '@/hooks/useRecipeContract';
import { useAccount } from 'wagmi';
import { User, Plus, ChefHat } from 'lucide-react';

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

const MyRecipesPage = () => {
  const { isConnected, address } = useAccount();
  const { data: userRecipes, isLoading: isLoadingRecipes } = useUserRecipes();
  const { data: userRecipeCount } = useUserRecipeCount();

  const recipeIds = userRecipes ? (userRecipes as bigint[]).map(id => Number(id)) : [];
  const recipeCount = userRecipeCount ? Number(userRecipeCount) : 0;

  if (!isConnected) {
    return (
      <PageTransition>
        <div className="container py-16 text-center">
          <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Connect Your Wallet</h1>
          <p className="text-muted-foreground">
            Please connect your wallet to view your recipes
          </p>
        </div>
      </PageTransition>
    );
  }

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
          <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <User className="h-8 w-8 text-primary" />
                My Recipes
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your encrypted culinary creations
              </p>
              {address && (
                <p className="text-xs font-mono text-muted-foreground mt-2">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="px-4 py-2 rounded-lg bg-primary/10 text-primary">
                <span className="font-bold text-xl">{recipeCount}</span>
                <span className="text-sm ml-2">recipes</span>
              </div>
              <Link to="/create">
                <Button className="gap-2 gradient-primary text-white">
                  <Plus className="h-4 w-4" />
                  New Recipe
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Content */}
          {isLoadingRecipes ? (
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
              <p className="text-muted-foreground">Loading your recipes...</p>
            </motion.div>
          ) : recipeIds.length === 0 ? (
            <motion.div
              variants={itemVariants}
              className="text-center py-16 rounded-lg border border-dashed border-border"
            >
              <ChefHat className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground mb-2">No recipes yet</p>
              <p className="text-sm text-muted-foreground mb-6">
                Start by creating your first encrypted recipe!
              </p>
              <Link to="/create">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Recipe
                </Button>
              </Link>
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

export default MyRecipesPage;
