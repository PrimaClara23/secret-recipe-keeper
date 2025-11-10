import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { EncryptedRecipeKeeper } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("EncryptedRecipeKeeperSepolia", function () {
  let signers: Signers;
  let encryptedRecipeKeeperContract: EncryptedRecipeKeeper;
  let encryptedRecipeKeeperContractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const EncryptedRecipeKeeperDeployment = await deployments.get("EncryptedRecipeKeeper");
      encryptedRecipeKeeperContractAddress = EncryptedRecipeKeeperDeployment.address;
      encryptedRecipeKeeperContract = await ethers.getContractAt("EncryptedRecipeKeeper", EncryptedRecipeKeeperDeployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("submit and decrypt encrypted recipe", async function () {
    steps = 12;

    this.timeout(4 * 60000); // Increased timeout for Sepolia

    progress("Preparing recipe data...");
    const title = "Sepolia Test Risotto";
    const description = "Testing encrypted recipe on Sepolia network";
    const prepTime = "45 mins";

    const ingredientNames = ["Arborio rice", "Secret truffle oil", "Parmesan cheese"];
    const encryptedIngredientIndices = [1]; // Second ingredient is encrypted

    progress("Encrypting ingredient amount...");
    const encryptedAmount = await fhevm
      .createEncryptedInput(encryptedRecipeKeeperContractAddress, signers.alice.address)
      .add32(30) // 3 tbsp
      .encrypt();

    const encryptedAmounts = [encryptedAmount.handles[0]];
    const amountProofs = [encryptedAmount.inputProof];

    const stepDescriptions = ["Toast rice in butter", "Add secret truffle oil at 65°C", "Gradually add stock"];
    const encryptedStepIndices = [1]; // Second step is encrypted

    progress(`Submitting recipe to ${encryptedRecipeKeeperContractAddress}...`);
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

    progress("Recipe submitted, verifying data...");
    const recipeCount = await encryptedRecipeKeeperContract.getRecipeCount();
    expect(recipeCount).to.eq(1);

    const recipe = await encryptedRecipeKeeperContract.getRecipe(0);
    expect(recipe.title).to.eq(title);
    expect(recipe.chef).to.eq(signers.alice.address);
    expect(recipe.isActive).to.eq(true);

    progress("Verifying encrypted ingredients...");
    const [names, isEncrypted] = await encryptedRecipeKeeperContract.getRecipeIngredients(0);
    expect(names.length).to.eq(3);
    expect(isEncrypted[1]).to.eq(true);

    progress("Decrypting encrypted ingredient...");
    const encryptedIngredient = await encryptedRecipeKeeperContract
      .connect(signers.alice)
      .getEncryptedIngredient(0, 1);

    const clearAmount = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedIngredient,
      encryptedRecipeKeeperContractAddress,
      signers.alice,
    );
    progress(`Decrypted ingredient amount: ${clearAmount / 10} tbsp`);
    expect(clearAmount).to.eq(30);

    progress("Verifying encrypted steps...");
    const [stepDescs, stepEncrypted] = await encryptedRecipeKeeperContract.getRecipeSteps(0);
    expect(stepDescs.length).to.eq(3);
    expect(stepEncrypted[1]).to.eq(true);

    progress("Recipe verification complete!");
  });
});
