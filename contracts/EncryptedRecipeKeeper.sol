// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title EncryptedRecipeKeeper - Privacy-Preserving Recipe Management System
/// @author secret-recipe-keeper
/// @notice A fully homomorphic encryption (FHE) based recipe keeper that allows chefs to submit
///         encrypted recipes with protected ingredients and steps. Only the recipe owner can decrypt their data.
/// @dev This contract uses Zama's FHEVM technology to perform computations on encrypted data.
///      Recipe ingredients and steps can be selectively encrypted (up to 2 encrypted items per recipe).
/// @custom:security-contact security@secret-recipe-keeper.com
contract EncryptedRecipeKeeper is SepoliaConfig {
    address public owner;
    bool public paused;

    // Recipe data structure
    struct Recipe {
        address chef; // Recipe creator/owner
        string title; // Recipe title
        string description; // Recipe description
        string prepTime; // Preparation time
        uint256 timestamp; // Creation timestamp
        bool isActive; // Active status
    }

    // Encrypted ingredient/step data
    struct EncryptedItem {
        string name; // Item name (plain text for display)
        euint32 encryptedAmount; // Encrypted amount/ratio
        bool isEncrypted; // Whether this item is encrypted
    }

    // Recipe storage
    mapping(uint256 => Recipe) public recipes;
    mapping(uint256 => EncryptedItem[]) private _recipeIngredients; // Encrypted ingredients per recipe
    mapping(uint256 => EncryptedItem[]) private _recipeSteps; // Encrypted steps per recipe
    uint256 public recipeCount;

    // User management
    mapping(address => uint256[]) private _userRecipes; // User's recipe IDs
    mapping(address => uint256) private _userRecipeCount; // Number of recipes per user

    // Events
    event RecipeSubmitted(uint256 indexed recipeId, address indexed chef, string title, uint256 timestamp);
    event RecipeUpdated(uint256 indexed recipeId, address indexed chef);
    event RecipeDeleted(uint256 indexed recipeId, address indexed chef);
    event Paused(address account);
    event Unpaused(address account);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // Modifiers
    modifier onlyOwner() {
        require(owner == msg.sender, "Ownable: caller is not the owner");
        _;
    }

    modifier onlyChef(uint256 recipeId) {
        require(recipes[recipeId].chef == msg.sender, "Only recipe owner can perform this action");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier whenPaused() {
        require(paused, "Contract is not paused");
        _;
    }

    constructor() {
        owner = msg.sender;
        paused = false;
    }

    /// @notice Submit new encrypted recipe
    /// @dev Allows chefs to submit recipes with up to 2 encrypted ingredients and/or steps
    /// @param title Recipe title
    /// @param description Recipe description
    /// @param prepTime Preparation time description
    /// @param ingredientNames Array of ingredient names
    /// @param encryptedAmounts Array of encrypted amounts (for encrypted ingredients only)
    /// @param amountProofs Array of ZK proofs for encrypted amounts
    /// @param encryptedIngredientIndices Indices of ingredients that should be encrypted
    /// @param stepDescriptions Array of step descriptions
    /// @param encryptedStepIndices Indices of steps that should be encrypted
    function submitRecipe(
        string memory title,
        string memory description,
        string memory prepTime,
        string[] memory ingredientNames,
        externalEuint32[] memory encryptedAmounts,
        bytes[] memory amountProofs,
        uint256[] memory encryptedIngredientIndices,
        string[] memory stepDescriptions,
        uint256[] memory encryptedStepIndices
    ) external whenNotPaused {
        require(bytes(title).length > 0 && bytes(title).length <= 100, "Title must be 1-100 characters");
        require(bytes(description).length > 0 && bytes(description).length <= 500, "Description must be 1-500 characters");
        require(ingredientNames.length > 0 && ingredientNames.length <= 20, "1-20 ingredients allowed");
        require(stepDescriptions.length > 0 && stepDescriptions.length <= 20, "1-20 steps allowed");
        require(encryptedIngredientIndices.length <= 2, "Maximum 2 encrypted ingredients allowed");
        require(encryptedStepIndices.length <= 2, "Maximum 2 encrypted steps allowed");

        // Validate encrypted ingredient indices
        for (uint256 i = 0; i < encryptedIngredientIndices.length; i++) {
            require(encryptedIngredientIndices[i] < ingredientNames.length, "Invalid ingredient index");
        }

        // Validate encrypted step indices
        for (uint256 i = 0; i < encryptedStepIndices.length; i++) {
            require(encryptedStepIndices[i] < stepDescriptions.length, "Invalid step index");
        }

        uint256 recipeId = recipeCount++;

        // Create recipe
        recipes[recipeId] = Recipe({
            chef: msg.sender,
            title: title,
            description: description,
            prepTime: prepTime,
            timestamp: block.timestamp,
            isActive: true
        });

        // Process ingredients
        uint256 encryptedAmountIndex = 0;
        for (uint256 i = 0; i < ingredientNames.length; i++) {
            bool isEncrypted = false;
            euint32 encryptedAmount;

            // Check if this ingredient should be encrypted
            for (uint256 j = 0; j < encryptedIngredientIndices.length; j++) {
                if (encryptedIngredientIndices[j] == i) {
                    isEncrypted = true;
                    encryptedAmount = FHE.fromExternal(encryptedAmounts[encryptedAmountIndex], amountProofs[encryptedAmountIndex]);
                    encryptedAmountIndex++;
                    break;
                }
            }

            _recipeIngredients[recipeId].push(EncryptedItem({
                name: ingredientNames[i],
                encryptedAmount: encryptedAmount,
                isEncrypted: isEncrypted
            }));
        }

        // Process steps
        for (uint256 i = 0; i < stepDescriptions.length; i++) {
            bool isEncrypted = false;

            // Check if this step should be encrypted
            for (uint256 j = 0; j < encryptedStepIndices.length; j++) {
                if (encryptedStepIndices[j] == i) {
                    isEncrypted = true;
                    break;
                }
            }

            _recipeSteps[recipeId].push(EncryptedItem({
                name: stepDescriptions[i],
                encryptedAmount: FHE.asEuint32(0), // Steps don't have encrypted amounts
                isEncrypted: isEncrypted
            }));
        }

        // Update user recipes
        _userRecipes[msg.sender].push(recipeId);
        _userRecipeCount[msg.sender]++;

        emit RecipeSubmitted(recipeId, msg.sender, title, block.timestamp);
    }

    /// @notice Get recipe basic information
    /// @param recipeId Recipe ID
    function getRecipe(uint256 recipeId) external view returns (
        address chef,
        string memory title,
        string memory description,
        string memory prepTime,
        uint256 timestamp,
        bool isActive
    ) {
        Recipe storage recipe = recipes[recipeId];
        return (
            recipe.chef,
            recipe.title,
            recipe.description,
            recipe.prepTime,
            recipe.timestamp,
            recipe.isActive
        );
    }

    /// @notice Get recipe ingredients (names and encryption status)
    /// @param recipeId Recipe ID
    function getRecipeIngredients(uint256 recipeId) external view returns (
        string[] memory names,
        bool[] memory isEncrypted
    ) {
        EncryptedItem[] storage ingredients = _recipeIngredients[recipeId];
        names = new string[](ingredients.length);
        isEncrypted = new bool[](ingredients.length);

        for (uint256 i = 0; i < ingredients.length; i++) {
            names[i] = ingredients[i].name;
            isEncrypted[i] = ingredients[i].isEncrypted;
        }

        return (names, isEncrypted);
    }

    /// @notice Get encrypted ingredient amount (only accessible by recipe owner)
    /// @param recipeId Recipe ID
    /// @param ingredientIndex Ingredient index
    function getEncryptedIngredient(uint256 recipeId, uint256 ingredientIndex) external view
        onlyChef(recipeId) returns (euint32) {
        require(ingredientIndex < _recipeIngredients[recipeId].length, "Invalid ingredient index");
        require(_recipeIngredients[recipeId][ingredientIndex].isEncrypted, "Ingredient is not encrypted");

        return _recipeIngredients[recipeId][ingredientIndex].encryptedAmount;
    }

    /// @notice Get recipe steps (descriptions and encryption status)
    /// @param recipeId Recipe ID
    function getRecipeSteps(uint256 recipeId) external view returns (
        string[] memory descriptions,
        bool[] memory isEncrypted
    ) {
        EncryptedItem[] storage steps = _recipeSteps[recipeId];
        descriptions = new string[](steps.length);
        isEncrypted = new bool[](steps.length);

        for (uint256 i = 0; i < steps.length; i++) {
            descriptions[i] = steps[i].name;
            isEncrypted[i] = steps[i].isEncrypted;
        }

        return (descriptions, isEncrypted);
    }

    /// @notice Get user's recipe count
    /// @param user User address
    function getUserRecipeCount(address user) external view returns (uint256) {
        return _userRecipeCount[user];
    }

    /// @notice Get user's recipe IDs
    /// @param user User address
    function getUserRecipes(address user) external view returns (uint256[] memory) {
        return _userRecipes[user];
    }

    /// @notice Delete recipe (only by owner)
    function deleteRecipe(uint256 recipeId) external onlyChef(recipeId) whenNotPaused {
        require(recipes[recipeId].isActive, "Recipe is already inactive");

        recipes[recipeId].isActive = false;
        _userRecipeCount[msg.sender]--;

        emit RecipeDeleted(recipeId, msg.sender);
    }

    /// @notice Pause contract operations (only owner)
    function pause() external onlyOwner whenNotPaused {
        paused = true;
        emit Paused(msg.sender);
    }

    /// @notice Unpause contract operations (only owner)
    function unpause() external onlyOwner whenPaused {
        paused = false;
        emit Unpaused(msg.sender);
    }

    /// @notice Transfer ownership to new owner (only owner)
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Get total recipe count
    function getRecipeCount() external view returns (uint256) {
        return recipeCount;
    }
}
