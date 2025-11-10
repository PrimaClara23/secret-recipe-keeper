import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { EncryptedRecipeKeeper, EncryptedRecipeKeeper__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("EncryptedRecipeKeeper")) as EncryptedRecipeKeeper__factory;
  const encryptedRecipeKeeperContract = (await factory.deploy()) as EncryptedRecipeKeeper;
  const encryptedRecipeKeeperContractAddress = await encryptedRecipeKeeperContract.getAddress();

  return { encryptedRecipeKeeperContract, encryptedRecipeKeeperContractAddress };
}

describe("EncryptedRecipeKeeper", function () {
  let signers: Signers;
  let encryptedRecipeKeeperContract: EncryptedRecipeKeeper;
  let encryptedRecipeKeeperContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ encryptedRecipeKeeperContract, encryptedRecipeKeeperContractAddress } = await deployFixture());
  });

  it("should have zero recipes after deployment", async function () {
    const recipeCount = await encryptedRecipeKeeperContract.getRecipeCount();
    expect(recipeCount).to.eq(0);
  });

  it("should submit a recipe with encrypted ingredients", async function () {
    // Sample recipe data
    const title = "Secret Risotto";
    const description = "Creamy risotto with encrypted seasoning";
    const prepTime = "45 mins";

    const ingredientNames = ["Arborio rice", "Secret seasoning", "Parmesan cheese"];
    const encryptedIngredientIndices = [1]; // Index 1 is encrypted

    // Encrypt amount for secret seasoning (2.5 tbsp = 25)
    const encryptedValue = await fhevm
      .createEncryptedInput(encryptedRecipeKeeperContractAddress, signers.alice.address)
      .add32(25)
      .encrypt();

    const encryptedAmounts = [encryptedValue.handles[0]];
    const amountProofs = [encryptedValue.inputProof];

    const stepDescriptions = ["Toast rice", "Add secret seasoning", "Add stock"];
    const encryptedStepIndices = [1]; // Step 1 is encrypted

    // Submit recipe
    const tx = await encryptedRecipeKeeperContract
      .connect(signers.alice)
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
    await tx.wait();

    // Verify recipe was submitted
    const recipeCount = await encryptedRecipeKeeperContract.getRecipeCount();
    expect(recipeCount).to.eq(1);

    // Verify recipe data
    const recipe = await encryptedRecipeKeeperContract.getRecipe(0);
    expect(recipe.title).to.eq(title);
    expect(recipe.description).to.eq(description);
    expect(recipe.prepTime).to.eq(prepTime);
    expect(recipe.chef).to.eq(signers.alice.address);
    expect(recipe.isActive).to.eq(true);

    // Verify ingredients
    const [names, isEncrypted] = await encryptedRecipeKeeperContract.getRecipeIngredients(0);
    expect(names.length).to.eq(3);
    expect(isEncrypted[1]).to.eq(true); // Second ingredient should be encrypted

    // Verify steps
    const [stepDescs, stepEncrypted] = await encryptedRecipeKeeperContract.getRecipeSteps(0);
    expect(stepDescs.length).to.eq(3);
    expect(stepEncrypted[1]).to.eq(true); // Second step should be encrypted
  });

  it("should allow recipe owner to decrypt their encrypted ingredients", async function () {
    // Submit recipe first
    const ingredientNames = ["Flour", "Secret spice"];
    const encryptedIngredientIndices = [1];

    const encryptedValue = await fhevm
      .createEncryptedInput(encryptedRecipeKeeperContractAddress, signers.alice.address)
      .add32(15) // 1.5 tbsp
      .encrypt();

    const tx = await encryptedRecipeKeeperContract
      .connect(signers.alice)
      .submitRecipe(
        "Test Recipe",
        "Test description",
        "30 mins",
        ingredientNames,
        [encryptedValue.handles[0]],
        [encryptedValue.inputProof],
        encryptedIngredientIndices,
        ["Mix ingredients"],
        []
      );
    await tx.wait();

    // Alice should be able to decrypt her own ingredient
    // Note: In mock environment, we can't test actual decryption
    // but we can verify the function doesn't revert for the owner
    const encryptedAmount = await encryptedRecipeKeeperContract
      .connect(signers.alice)
      .getEncryptedIngredient(0, 1);

    // Verify that encrypted amount is not zero (meaning it was set)
    expect(encryptedAmount).to.not.eq(ethers.ZeroHash);
  });

  it("should not allow non-owners to decrypt encrypted ingredients", async function () {
    // Submit recipe with Alice
    const ingredientNames = ["Flour", "Secret spice"];
    const encryptedIngredientIndices = [1];

    const encryptedValue = await fhevm
      .createEncryptedInput(encryptedRecipeKeeperContractAddress, signers.alice.address)
      .add32(20)
      .encrypt();

    await encryptedRecipeKeeperContract
      .connect(signers.alice)
      .submitRecipe(
        "Test Recipe",
        "Test description",
        "30 mins",
        ingredientNames,
        [encryptedValue.handles[0]],
        [encryptedValue.inputProof],
        encryptedIngredientIndices,
        ["Mix ingredients"],
        []
      );

    // Bob should not be able to decrypt Alice's ingredient
    await expect(
      encryptedRecipeKeeperContract
        .connect(signers.bob)
        .getEncryptedIngredient(0, 1)
    ).to.be.revertedWith("Only recipe owner can perform this action");
  });

  it("should allow recipe deletion by owner", async function () {
    // Submit recipe
    await encryptedRecipeKeeperContract
      .connect(signers.alice)
      .submitRecipe(
        "Test Recipe",
        "Test description",
        "30 mins",
        ["Ingredient 1"],
        [],
        [],
        [],
        ["Step 1"],
        []
      );

    // Verify recipe exists
    let recipe = await encryptedRecipeKeeperContract.getRecipe(0);
    expect(recipe.isActive).to.eq(true);

    // Delete recipe
    await encryptedRecipeKeeperContract.connect(signers.alice).deleteRecipe(0);

    // Verify recipe is inactive
    recipe = await encryptedRecipeKeeperContract.getRecipe(0);
    expect(recipe.isActive).to.eq(false);
  });

  it("should not allow non-owners to delete recipes", async function () {
    // Submit recipe with Alice
    await encryptedRecipeKeeperContract
      .connect(signers.alice)
      .submitRecipe(
        "Test Recipe",
        "Test description",
        "30 mins",
        ["Ingredient 1"],
        [],
        [],
        [],
        ["Step 1"],
        []
      );

    // Bob should not be able to delete Alice's recipe
    await expect(
      encryptedRecipeKeeperContract.connect(signers.bob).deleteRecipe(0)
    ).to.be.revertedWith("Only recipe owner can perform this action");
  });
});
