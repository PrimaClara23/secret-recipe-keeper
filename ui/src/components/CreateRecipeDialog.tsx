import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Lock, ChefHat } from 'lucide-react';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { useSubmitRecipe } from '@/hooks/useRecipeContract';

const CreateRecipeDialog = () => {
  const [open, setOpen] = useState(false);
  const { isConnected } = useAccount();
  const submitRecipe = useSubmitRecipe();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prepTime: '',
    ingredients: [''],
    amounts: [''],
    encryptIngredients: [false],
    steps: [''],
    encryptSteps: [false],
  });

  const handleAddIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, ''],
      amounts: [...formData.amounts, ''],
      encryptIngredients: [...formData.encryptIngredients, false],
    });
  };

  const handleAddStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, ''],
      encryptSteps: [...formData.encryptSteps, false],
    });
  };

  const handleSubmit = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet to create recipes');
      return;
    }

    if (!formData.title || !formData.description) {
      toast.error('Please fill in title and description');
      return;
    }

    // Validate encrypted items limit
    const encryptedIngredientsCount = formData.encryptIngredients.filter(Boolean).length;
    const encryptedStepsCount = formData.encryptSteps.filter(Boolean).length;

    if (encryptedIngredientsCount > 2) {
      toast.error('Maximum 2 ingredients can be encrypted');
      return;
    }

    if (encryptedStepsCount > 2) {
      toast.error('Maximum 2 steps can be encrypted');
      return;
    }

    if (encryptedIngredientsCount + encryptedStepsCount > 2) {
      toast.error('Maximum 2 items total can be encrypted (ingredients + steps)');
      return;
    }

    if (formData.ingredients.length > 20) {
      toast.error('Maximum 20 ingredients allowed');
      return;
    }

    if (formData.steps.length > 20) {
      toast.error('Maximum 20 steps allowed');
      return;
    }

    try {
      // Filter out empty ingredients and steps
      const validIngredients = formData.ingredients
        .map((name, index) => ({ name: name.trim(), amount: formData.amounts[index] || '', index }))
        .filter(item => item.name.length > 0);
      
      const validSteps = formData.steps
        .map(step => step.trim())
        .filter(step => step.length > 0);

      if (validIngredients.length === 0) {
        toast.error('Please add at least one ingredient');
        return;
      }

      if (validSteps.length === 0) {
        toast.error('Please add at least one step');
        return;
      }

      // Map encrypted indices to valid ingredient indices
      const encryptedIngredientIndices = formData.encryptIngredients
        .map((encrypted, originalIndex) => {
          if (!encrypted) return -1;
          // Find the index in validIngredients array
          const validIndex = validIngredients.findIndex(item => item.index === originalIndex);
          return validIndex;
        })
        .filter(index => index >= 0);

      const encryptedStepIndices = formData.encryptSteps
        .map((encrypted, index) => encrypted ? index : -1)
        .filter(index => index >= 0 && index < validSteps.length);

      toast.info('Encrypting data and submitting recipe...');

      // Submit recipe with FHE encryption
      await submitRecipe.mutateAsync({
        title: formData.title,
        description: formData.description,
        prepTime: formData.prepTime,
        ingredientNames: validIngredients.map(item => item.name),
        ingredientAmounts: validIngredients.map(item => item.amount),
        encryptedIngredientIndices,
        stepDescriptions: validSteps,
        encryptedStepIndices,
      });

      setOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Recipe creation error:', error);
      // Error toast is handled by the mutation's onError
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      prepTime: '',
      ingredients: [''],
      amounts: [''],
      encryptIngredients: [false],
      steps: [''],
      encryptSteps: [false],
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Create New Recipe
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Encrypted Recipe</DialogTitle>
          <DialogDescription>
            Add your recipe details and choose which parts to encrypt for protection.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Recipe Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Grandma's Secret Pasta"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe your recipe..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prepTime">Prep Time</Label>
            <Input
              id="prepTime"
              placeholder="e.g., 30 mins"
              value={formData.prepTime}
              onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
            />
          </div>

          <div className="space-y-3">
            <Label>Ingredients (max 2 encrypted)</Label>
            {formData.ingredients.map((ingredient, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder="Ingredient name"
                  value={ingredient}
                  className="flex-1"
                  onChange={(e) => {
                    const newIngredients = [...formData.ingredients];
                    newIngredients[index] = e.target.value;
                    setFormData({ ...formData, ingredients: newIngredients });
                  }}
                />
                <Input
                  placeholder="Amount"
                  value={formData.amounts[index]}
                  className="w-24"
                  onChange={(e) => {
                    const newAmounts = [...formData.amounts];
                    newAmounts[index] = e.target.value;
                    setFormData({ ...formData, amounts: newAmounts });
                  }}
                />
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <Switch
                    checked={formData.encryptIngredients[index]}
                    onCheckedChange={(checked) => {
                      const newEncrypt = [...formData.encryptIngredients];
                      newEncrypt[index] = checked;
                      setFormData({ ...formData, encryptIngredients: newEncrypt });
                    }}
                    disabled={formData.encryptIngredients.filter(Boolean).length >= 2 && !formData.encryptIngredients[index]}
                  />
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={handleAddIngredient}>
              <Plus className="h-4 w-4 mr-1" /> Add Ingredient
            </Button>
          </div>

          <div className="space-y-3">
            <Label>Preparation Steps</Label>
            {formData.steps.map((step, index) => (
              <div key={index} className="flex items-start gap-2">
                <Textarea
                  placeholder={`Step ${index + 1}`}
                  value={step}
                  onChange={(e) => {
                    const newSteps = [...formData.steps];
                    newSteps[index] = e.target.value;
                    setFormData({ ...formData, steps: newSteps });
                  }}
                />
                <div className="flex items-center gap-2 pt-2 whitespace-nowrap">
                  <Switch
                    checked={formData.encryptSteps[index]}
                    onCheckedChange={(checked) => {
                      const newEncrypt = [...formData.encryptSteps];
                      newEncrypt[index] = checked;
                      setFormData({ ...formData, encryptSteps: newEncrypt });
                    }}
                  />
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={handleAddStep}>
              <Plus className="h-4 w-4 mr-1" /> Add Step
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create Recipe</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRecipeDialog;
