import Header from '@/components/Header';
import Footer from '@/components/Footer';
import RecipeCard from '@/components/RecipeCard';
import CreateRecipeDialog from '@/components/CreateRecipeDialog';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useRecipeCount, useContractAddress } from '@/hooks/useRecipeContract';
import { useAccount, useChainId } from 'wagmi';

const Index = () => {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const contractAddress = useContractAddress();
  const { data: recipeCount, isLoading: isLoadingCount, error: countError } = useRecipeCount();

  // Debug logging
  console.log('[Index] State:', {
    recipeCount,
    isLoadingCount,
    error: countError,
    isConnected,
    address,
    chainId,
    contractAddress,
  });

  // Generate recipe IDs based on count
  const recipeIds = recipeCount ? Array.from({ length: Number(recipeCount) }, (_, i) => i) : [];

  // Show error if count query failed
  if (countError) {
    console.error('[Index] Error loading recipe count:', countError);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container py-8">
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Secret Recipe Vault</h2>
              <p className="text-muted-foreground">
                Protect your culinary innovations with fully homomorphic encryption
              </p>
              {isConnected && (
                <div className="text-sm text-muted-foreground mt-1 space-y-1">
                  {recipeCount !== undefined && (
                    <p>{recipeCount} recipes stored on blockchain</p>
                  )}
                  {contractAddress && (
                    <p className="text-xs font-mono">
                      Contract: {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)} (Chain: {chainId})
                    </p>
                  )}
                  {!contractAddress && (
                    <p className="text-xs text-yellow-600">
                      ⚠️ Contract not deployed on chain {chainId}
                    </p>
                  )}
                </div>
              )}
            </div>
            <CreateRecipeDialog />
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recipes..."
              className="pl-10"
            />
          </div>
        </div>

        {!isConnected ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground">
              <p className="text-lg mb-2">Connect your wallet to view recipes</p>
              <p className="text-sm">Secure your culinary secrets with blockchain encryption</p>
            </div>
          </div>
        ) : isLoadingCount ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground">
              <p className="text-lg mb-2">Loading recipes...</p>
              <p className="text-sm">Please wait while we fetch data from the blockchain</p>
            </div>
          </div>
        ) : countError ? (
          <div className="text-center py-12">
            <div className="text-destructive">
              <p className="text-lg mb-2">Error loading recipes</p>
              <p className="text-sm">{String(countError.message || countError)}</p>
              <p className="text-xs mt-2 text-muted-foreground">
                Make sure you're connected to the correct network and the contract is deployed
              </p>
            </div>
          </div>
        ) : recipeIds.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground">
              <p className="text-lg mb-2">No recipes found</p>
              <p className="text-sm">Be the first to share your encrypted recipe!</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipeIds.map((recipeId) => (
              <RecipeCard key={recipeId} recipeId={recipeId} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Index;
