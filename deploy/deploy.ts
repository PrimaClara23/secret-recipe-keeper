import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedEncryptedRecipeKeeper = await deploy("EncryptedRecipeKeeper", {
    from: deployer,
    log: true,
  });

  console.log(`EncryptedRecipeKeeper contract: `, deployedEncryptedRecipeKeeper.address);
};
export default func;
func.id = "deploy_encryptedRecipeKeeper"; // id required to prevent reexecution
func.tags = ["EncryptedRecipeKeeper"];
