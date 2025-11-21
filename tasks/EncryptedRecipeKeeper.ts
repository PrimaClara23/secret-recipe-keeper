import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Tutorial: Deploy and Interact Locally (--network localhost)
 * ===========================================================
 *
 * 1. From a separate terminal window:
 *
 *   npx hardhat node
 *
 * 2. Deploy the EncryptedRecipeKeeper contract
 *
 *   npx hardhat --network localhost deploy
 *
 * 3. Interact with the EncryptedRecipeKeeper contract
 *
 *   npx hardhat --network localhost task:submit-recipe
 *   npx hardhat --network localhost task:list-recipes
 *   npx hardhat --network localhost task:decrypt-recipe --recipe-id 0
 *
 *
 * Tutorial: Deploy and Interact on Sepolia (--network sepolia)
 * ===========================================================
 *
 * 1. Deploy the EncryptedRecipeKeeper contract
 *
 *   npx hardhat --network sepolia deploy
 *
 * 2. Interact with the EncryptedRecipeKeeper contract
 *
 *   npx hardhat --network sepolia task:submit-recipe
 *   npx hardhat --network sepolia task:list-recipes
 *   npx hardhat --network sepolia task:decrypt-recipe --recipe-id 0
 *
 */

/**
 * Example:
 *   - npx hardhat --network localhost task:address
 *   - npx hardhat --network sepolia task:address
 */
task("task:address", "Prints the EncryptedRecipeKeeper address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const encryptedRecipeKeeper = await deployments.get("EncryptedRecipeKeeper");

  console.log("EncryptedRecipeKeeper address is " + encryptedRecipeKeeper.address);
});

/**
 * Example:
 *   - npx hardhat --network localhost task:submit-recipe
 *   - npx hardhat --network sepolia task:submit-recipe
 */
task("task:submit-recipe", "Submits a sample encrypted recipe")
  .addOptionalParam("address", "Optionally specify the EncryptedRecipeKeeper contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const EncryptedRecipeKeeperDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("EncryptedRecipeKeeper");
    console.log(`EncryptedRecipeKeeper: ${EncryptedRecipeKeeperDeployment.address}`);

    const signers = await ethers.getSigners();
    const recipeKeeperContract = await ethers.getContractAt("EncryptedRecipeKeeper", EncryptedRecipeKeeperDeployment.address);

    // Sample recipe data
    const title = "Chef's Secret Risotto";
    const description = "A creamy risotto with proprietary seasoning blend";
    const prepTime = "45 mins";

    // Ingredients (with one encrypted ingredient)
    const ingredientNames = ["Arborio rice", "Special seasoning blend", "Parmesan cheese", "White wine"];
    const encryptedIngredientIndices = [1]; // Index 1 (Special seasoning blend) is encrypted

    // Encrypt the amount for the special seasoning blend (2.5 tbsp)
    const encryptedValue = await fhevm
      .createEncryptedInput(EncryptedRecipeKeeperDeployment.address, signers[0].address)
      .add32(25) // 2.5 * 10 (to handle decimals)
      .encrypt();

    const encryptedAmounts = [encryptedValue.handles[0]];
    const amountProofs = [encryptedValue.inputProof];

    // Steps (with one encrypted step)
    const stepDescriptions = [
      "Toast rice in butter until translucent",
      "Add proprietary seasoning blend at precise temperature", // This step will be encrypted
      "Gradually add warm stock while stirring",
      "Finish with cheese and butter"
    ];
    const encryptedStepIndices = [1]; // Index 1 step is encrypted

    console.log("Submitting encrypted recipe...");

    const tx = await recipeKeeperContract
      .connect(signers[0])
      .submitRecipe(
        title,
        description,
        prepTime,
        ingredientNames,
        encryptedAmounts,
        amountProofs,
        encryptedIngredientIndices,
        stepDescriptions,
        encryptedStepIndices
      );

    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    const recipeCount = await recipeKeeperContract.getRecipeCount();
    console.log(`Total recipes after submission: ${recipeCount}`);

    console.log("Recipe submitted successfully!");
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:list-recipes
 *   - npx hardhat --network sepolia task:list-recipes
 */
task("task:list-recipes", "Lists all recipes")
  .addOptionalParam("address", "Optionally specify the EncryptedRecipeKeeper contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const EncryptedRecipeKeeperDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("EncryptedRecipeKeeper");
    console.log(`EncryptedRecipeKeeper: ${EncryptedRecipeKeeperDeployment.address}`);

    const recipeKeeperContract = await ethers.getContractAt("EncryptedRecipeKeeper", EncryptedRecipeKeeperDeployment.address);

    const recipeCount = await recipeKeeperContract.getRecipeCount();
    console.log(`Total recipes: ${recipeCount}`);

    for (let i = 0; i < recipeCount; i++) {
      const recipe = await recipeKeeperContract.getRecipe(i);
      if (recipe.isActive) {
        console.log(`Recipe ${i}: ${recipe.title} by ${recipe.chef}`);
        console.log(`  Description: ${recipe.description}`);
        console.log(`  Prep Time: ${recipe.prepTime}`);

        const [ingredientNames, ingredientEncrypted] = await recipeKeeperContract.getRecipeIngredients(i);
        console.log(`  Ingredients (${ingredientNames.length}):`);
        for (let j = 0; j < ingredientNames.length; j++) {
          const encryptedMark = ingredientEncrypted[j] ? " [ENCRYPTED]" : "";
          console.log(`    - ${ingredientNames[j]}${encryptedMark}`);
        }

        const [stepDescriptions, stepEncrypted] = await recipeKeeperContract.getRecipeSteps(i);
        console.log(`  Steps (${stepDescriptions.length}):`);
        for (let j = 0; j < stepDescriptions.length; j++) {
          const encryptedMark = stepEncrypted[j] ? " [ENCRYPTED]" : "";
          console.log(`    ${j + 1}. ${stepDescriptions[j]}${encryptedMark}`);
        }
        console.log("---");
      }
    }
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:decrypt-recipe --recipe-id 0
 *   - npx hardhat --network sepolia task:decrypt-recipe --recipe-id 0
 */
task("task:decrypt-recipe", "Decrypts encrypted ingredients in a recipe")
  .addOptionalParam("address", "Optionally specify the EncryptedRecipeKeeper contract address")
  .addParam("recipeId", "The recipe ID to decrypt")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const recipeId = parseInt(taskArguments.recipeId);
    if (!Number.isInteger(recipeId)) {
      throw new Error(`Argument --recipe-id is not an integer`);
    }

    const EncryptedRecipeKeeperDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("EncryptedRecipeKeeper");
    console.log(`EncryptedRecipeKeeper: ${EncryptedRecipeKeeperDeployment.address}`);

    const signers = await ethers.getSigners();
    const recipeKeeperContract = await ethers.getContractAt("EncryptedRecipeKeeper", EncryptedRecipeKeeperDeployment.address);

    const recipe = await recipeKeeperContract.getRecipe(recipeId);
    if (!recipe.isActive) {
      console.log("Recipe is not active");
      return;
    }

    console.log(`Decrypting recipe: ${recipe.title}`);

    const [ingredientNames, ingredientEncrypted] = await recipeKeeperContract.getRecipeIngredients(recipeId);

    console.log("Ingredients:");
    for (let i = 0; i < ingredientNames.length; i++) {
      if (ingredientEncrypted[i]) {
        try {
          const encryptedAmount = await recipeKeeperContract.getEncryptedIngredient(recipeId, i);
          const clearAmount = await fhevm.userDecryptEuint(
            FhevmType.euint32,
            encryptedAmount,
            EncryptedRecipeKeeperDeployment.address,
            signers[0],
          );
          console.log(`  - ${ingredientNames[i]}: ${clearAmount / 10} tbsp [DECRYPTED]`);
        } catch (error) {
          console.log(`  - ${ingredientNames[i]}: [DECRYPTION FAILED - Not authorized]`);
        }
      } else {
        console.log(`  - ${ingredientNames[i]}: [Not encrypted]`);
      }
    }

    console.log("Recipe decryption completed!");
  });
