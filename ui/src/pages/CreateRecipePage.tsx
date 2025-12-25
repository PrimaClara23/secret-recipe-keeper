import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import PageTransition from '@/components/PageTransition';
import { Plus, Lock, Trash2, ChefHat, Clock, FileText } from 'lucide-react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { useSubmitRecipe } from '@/hooks/useRecipeContract';

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

const CreateRecipePage = () => {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const submitRecipe = useSubmitRecipe();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prepTime: '',
    ingredients: [{ name: '', amount: '', encrypted: false }],
    steps: [{ description: '', encrypted: false }],
  });

  const handleAddIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, { name: '', amount: '', encrypted: false }],
    });
  };

  const handleRemoveIngredient = (index: number) => {
    if (formData.ingredients.length > 1) {
      const newIngredients = formData.ingredients.filter((_, i) => i !== index);
      setFormData({ ...formData, ingredients: newIngredients });
    }
  };

  const handleAddStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, { description: '', encrypted: false }],
    });
  };

  const handleRemoveStep = (index: number) => {
    if (formData.steps.length > 1) {
      const newSteps = formData.steps.filter((_, i) => i !== index);
      setFormData({ ...formData, steps: newSteps });
    }
  };

  const handleSubmit = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet to create recipes');
      return;
    }

    if (!formData.title || formData.title.length < 3) {
      toast.error('Recipe title must be at least 3 characters');
      return;
    }

    if (!formData.description || formData.description.length < 10) {
      toast.error('Recipe description must be at least 10 characters');
      return;
    }

    const encryptedIngredientsCount = formData.ingredients.filter(i => i.encrypted).length;
    const encryptedStepsCount = formData.steps.filter(s => s.encrypted).length;

    if (encryptedIngredientsCount + encryptedStepsCount > 2) {
      toast.error('Maximum 2 items total can be encrypted');
      return;
    }

    const validIngredients = formData.ingredients.filter(i => i.name.trim());
    const validSteps = formData.steps.filter(s => s.description.trim());

    if (validIngredients.length === 0) {
      toast.error('Please add at least one ingredient');
      return;
    }

    if (validSteps.length === 0) {
      toast.error('Please add at least one step');
      return;
    }

    try {
      toast.info('Encrypting data and submitting recipe...');

      const encryptedIngredientIndices = formData.ingredients
        .map((ing, idx) => (ing.encrypted && ing.name.trim() ? idx : -1))
        .filter(idx => idx >= 0);

      const encryptedStepIndices = formData.steps
        .map((step, idx) => (step.encrypted && step.description.trim() ? idx : -1))
        .filter(idx => idx >= 0);

      await submitRecipe.mutateAsync({
        title: formData.title,
        description: formData.description,
        prepTime: formData.prepTime || 'Not specified',
        ingredientNames: validIngredients.map(i => i.name),
        ingredientAmounts: validIngredients.map(i => i.amount || '0'),
        encryptedIngredientIndices,
        stepDescriptions: validSteps.map(s => s.description),
        encryptedStepIndices,
      });

      navigate('/recipes');
    } catch (error) {
      console.error('Recipe creation error:', error);
    }
  };

  if (!isConnected) {
    return (
      <PageTransition>
        <div className="container py-16 text-center">
          <ChefHat className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Connect Your Wallet</h1>
          <p className="text-muted-foreground">
            Please connect your wallet to create encrypted recipes
          </p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container py-8 max-w-3xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <motion.div variants={itemVariants}>
            <h1 className="text-3xl font-bold">Create New Recipe</h1>
            <p className="text-muted-foreground mt-1">
              Add your recipe details and choose which parts to encrypt
            </p>
          </motion.div>

          {/* Basic Info */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  <Label htmlFor="prepTime" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Preparation Time
                  </Label>
                  <Input
                    id="prepTime"
                    placeholder="e.g., 30 mins"
                    value={formData.prepTime}
                    onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Ingredients */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  Ingredients
                </CardTitle>
                <CardDescription>
                  You can encrypt up to 2 items total (ingredients + steps)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.ingredients.map((ingredient, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Input
                      placeholder="Ingredient name"
                      value={ingredient.name}
                      className="flex-1"
                      onChange={(e) => {
                        const newIngredients = [...formData.ingredients];
                        newIngredients[index].name = e.target.value;
                        setFormData({ ...formData, ingredients: newIngredients });
                      }}
                    />
                    <Input
                      placeholder="Amount"
                      value={ingredient.amount}
                      className="w-24"
                      onChange={(e) => {
                        const newIngredients = [...formData.ingredients];
                        newIngredients[index].amount = e.target.value;
                        setFormData({ ...formData, ingredients: newIngredients });
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={ingredient.encrypted}
                        onCheckedChange={(checked) => {
                          const newIngredients = [...formData.ingredients];
                          newIngredients[index].encrypted = checked;
                          setFormData({ ...formData, ingredients: newIngredients });
                        }}
                      />
                      <Lock className={`h-4 w-4 ${ingredient.encrypted ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveIngredient(index)}
                      disabled={formData.ingredients.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={handleAddIngredient}>
                  <Plus className="h-4 w-4 mr-1" /> Add Ingredient
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Steps */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle>Preparation Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.steps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-2"
                  >
                    <span className="mt-2 text-sm font-medium text-muted-foreground w-6">
                      {index + 1}.
                    </span>
                    <Textarea
                      placeholder={`Step ${index + 1}`}
                      value={step.description}
                      className="flex-1"
                      onChange={(e) => {
                        const newSteps = [...formData.steps];
                        newSteps[index].description = e.target.value;
                        setFormData({ ...formData, steps: newSteps });
                      }}
                    />
                    <div className="flex items-center gap-2 pt-2">
                      <Switch
                        checked={step.encrypted}
                        onCheckedChange={(checked) => {
                          const newSteps = [...formData.steps];
                          newSteps[index].encrypted = checked;
                          setFormData({ ...formData, steps: newSteps });
                        }}
                      />
                      <Lock className={`h-4 w-4 ${step.encrypted ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveStep(index)}
                      disabled={formData.steps.length === 1}
                      className="mt-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={handleAddStep}>
                  <Plus className="h-4 w-4 mr-1" /> Add Step
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Submit */}
          <motion.div variants={itemVariants} className="flex gap-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate('/recipes')}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 gradient-primary text-white"
              onClick={handleSubmit}
              disabled={submitRecipe.isPending}
            >
              {submitRecipe.isPending ? 'Creating...' : 'Create Recipe'}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default CreateRecipePage;
