# Secret Recipe Keeper 🔐

A privacy-preserving recipe management system built on blockchain using Fully Homomorphic Encryption (FHE). This application allows chefs to securely store and manage their innovative recipes with encrypted ingredients and steps, protecting their intellectual property while maintaining full control over their data.

## 🌐 Live Demo

**Try it now:** [https://secret-recipe-keeper-1.vercel.app/](https://secret-recipe-keeper-1.vercel.app/)

## 🎥 Demo Video

Watch the full demonstration: [Demo Video](https://github.com/PrimaClara23/secret-recipe-keeper/blob/main/secret-recipe-keeper.mp4)

## ✨ Features

- **🔒 Fully Homomorphic Encryption**: Protect sensitive recipe data using Zama's FHEVM technology
- **👨‍🍳 Chef-Owned Data**: Only recipe creators can view and decrypt their encrypted data
- **📝 Flexible Encryption**: Encrypt up to 2 items (ingredients or steps) per recipe
- **🌐 Multi-Network Support**: Works on local Hardhat network and Sepolia testnet
- **💼 Wallet Integration**: Seamless wallet connection using RainbowKit
- **🎨 Modern UI**: Beautiful, responsive interface built with React and Tailwind CSS

## 🏗️ Architecture

### Smart Contract

The `EncryptedRecipeKeeper` contract is built on Solidity 0.8.24 and uses Zama's FHEVM protocol for encrypted data operations.

#### Key Data Structures

```solidity
struct Recipe {
    address chef;           // Recipe owner
    string title;           // Recipe title
    string description;     // Recipe description
    string prepTime;        // Preparation time
    uint256 timestamp;      // Creation timestamp
    bool isActive;          // Active status
}

struct EncryptedItem {
    string name;            // Item name (plain text)
    euint32 encryptedAmount; // Encrypted amount/ratio (euint32)
    bool isEncrypted;       // Encryption flag
}
```

#### Core Functions

1. **`submitRecipe`**: Submit a new recipe with optional encrypted ingredients/steps
   - Validates input (max 2 encrypted items total)
   - Encrypts ingredient amounts using FHE
   - Grants decryption permissions to contract and owner
   - Emits `RecipeSubmitted` event

2. **`getRecipe`**: Retrieve basic recipe information (public)

3. **`getRecipeIngredients`**: Get ingredient list with encryption status

4. **`getRecipeSteps`**: Get step list with encryption status

5. **`getEncryptedIngredient`**: Retrieve encrypted ingredient handle (owner-only)

6. **`deleteRecipe`**: Soft delete a recipe (owner-only)

#### Encryption Authorization

The contract uses FHEVM's access control system:

```solidity
// Grant access: contract and owner can decrypt
FHE.allowThis(encryptedAmount);  // Contract can decrypt
FHE.allow(encryptedAmount, msg.sender);  // Owner can decrypt
```

This ensures that:
- The contract can perform operations on encrypted data
- Only the recipe owner can decrypt their data
- No other users can access encrypted information

### Frontend Encryption/Decryption Logic

#### Encryption Flow

1. **Initialize FHEVM Instance**
   ```typescript
   // Local network (31337): Uses @fhevm/mock-utils
   // Sepolia (11155111): Uses @zama-fhe/relayer-sdk
   const fhevm = await initializeFHEVM(chainId);
   ```

2. **Encrypt Ingredient Amount**
   ```typescript
   // Create encrypted input (multiply by 10 for decimal precision)
   const encryptedInput = fhevm
     .createEncryptedInput(contractAddress, userAddress)
     .add32(Math.round(amount * 10));
   
   const encrypted = await encryptedInput.encrypt();
   // Returns: { handles: string[], inputProof: string }
   ```

3. **Submit to Contract**
   - Send encrypted handles and proof to `submitRecipe`
   - Contract validates and stores encrypted data
   - Authorization is set automatically

#### Decryption Flow

1. **Get Encrypted Handle**
   ```typescript
   // Retrieve encrypted handle from contract (owner-only)
   const encryptedAmount = await contract.getEncryptedIngredient(recipeId, index);
   ```

2. **Create Decryption Request**
   ```typescript
   // Generate keypair
   const keypair = fhevm.generateKeypair();
   
   // Create EIP712 typed data
   const eip712 = fhevm.createEIP712(
     keypair.publicKey,
     [contractAddress],
     startTimestamp,
     durationDays
   );
   
   // Sign with wallet
   const signature = await signer.signTypedData(
     eip712.domain,
     { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
     eip712.message
   );
   ```

3. **Decrypt Value**
   ```typescript
   // Local network: Uses Mock FHEVM with EIP712 signature
   // Sepolia: Uses official FHEVM SDK with relayer
   const result = await fhevm.userDecrypt(
     [{ handle, contractAddress }],
     keypair.privateKey,
     keypair.publicKey,
     signature.replace("0x", ""),
     contractAddresses,
     userAddress,
     startTimestamp,
     durationDays
   );
   
   // Convert back from integer (divide by 10)
   const decryptedAmount = Number(result[handle]) / 10;
   ```

#### Network-Specific Implementation

**Local Network (Hardhat - Chain ID 31337)**
- Uses `@fhevm/mock-utils` for Mock FHEVM
- Fetches metadata from Hardhat node via `fhevm_relayer_metadata` RPC
- Creates `MockFhevmInstance` with Hardhat plugin support
- Decryption requires EIP712 signature (same as Sepolia)

**Sepolia Testnet (Chain ID 11155111)**
- Uses `@zama-fhe/relayer-sdk` for official FHEVM
- Requires SDK initialization via `initSDK()`
- Uses MetaMask provider to avoid CORS issues
- Decryption goes through Zama's relayer network

## 🛠️ Tech Stack

### Smart Contracts
- **Solidity** ^0.8.24
- **FHEVM** - Zama's Fully Homomorphic Encryption Virtual Machine
- **Hardhat** - Development environment
- **@fhevm/hardhat-plugin** - FHEVM Hardhat integration

### Frontend
- **React** + **TypeScript** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **RainbowKit** - Wallet connection
- **Wagmi** - Ethereum React hooks
- **Ethers.js** v6 - Blockchain interaction
- **@zama-fhe/relayer-sdk** - Sepolia FHEVM SDK
- **@fhevm/mock-utils** - Local network Mock FHEVM

## 📦 Installation

### Prerequisites

- **Node.js**: Version 20 or higher
- **npm** or **yarn**: Package manager
- **MetaMask** or compatible Web3 wallet

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/PrimaClara23/secret-recipe-keeper.git
   cd secret-recipe-keeper
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install frontend dependencies
   cd ui
   npm install
   cd ..
   ```

3. **Set up environment variables**
   ```bash
   # Set your wallet mnemonic
   npx hardhat vars set MNEMONIC
   
   # Set Infura API key for Sepolia
   npx hardhat vars set INFURA_API_KEY
   
   # Optional: Set Etherscan API key for contract verification
   npx hardhat vars set ETHERSCAN_API_KEY
   ```

4. **Compile contracts**
   ```bash
   npm run compile
   ```

## 🚀 Usage

### Local Development

1. **Start Hardhat node**
   ```bash
   npx hardhat node
   ```
   This starts a local FHEVM-enabled Hardhat node on `http://localhost:8545`

2. **Deploy contract**
   ```bash
   npx hardhat deploy --network localhost
   ```
   Note the deployed contract address and update `ui/src/config/contracts.ts`

3. **Start frontend**
   ```bash
   cd ui
   npm run dev
   ```
   Frontend will be available at `http://localhost:8080`

4. **Connect wallet**
   - Open MetaMask
   - Add local network (Chain ID: 31337, RPC: http://localhost:8545)
   - Import test account from Hardhat node
   - Connect wallet in the app

### Sepolia Testnet

1. **Deploy to Sepolia**
   ```bash
   npx hardhat deploy --network sepolia
   ```

2. **Verify contract**
   ```bash
   npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
   ```

3. **Update contract address**
   - Update `CONTRACT_ADDRESSES[11155111]` in `ui/src/config/contracts.ts`

4. **Deploy frontend**
   - Frontend is automatically deployed to Vercel on push to main branch
   - Or deploy manually: `vercel --prod`

## 📁 Project Structure

```
secret-recipe-keeper/
├── contracts/
│   └── EncryptedRecipeKeeper.sol    # Main smart contract
├── deploy/
│   └── deploy.ts                    # Deployment script
├── test/
│   ├── EncryptedRecipeKeeper.ts     # Local network tests
│   └── EncryptedRecipeKeeperSepolia.ts  # Sepolia tests
├── tasks/
│   └── EncryptedRecipeKeeper.ts     # Hardhat tasks
├── types/                           # Generated TypeScript types
├── ui/                              # Frontend application
│   ├── src/
│   │   ├── components/
│   │   │   ├── CreateRecipeDialog.tsx
│   │   │   ├── RecipeCard.tsx
│   │   │   └── ...
│   │   ├── hooks/
│   │   │   └── useRecipeContract.ts
│   │   ├── lib/
│   │   │   └── fhevm.ts            # FHEVM encryption/decryption logic
│   │   └── config/
│   │       ├── contracts.ts
│   │       └── wagmi.ts
│   └── package.json
├── hardhat.config.ts
├── vercel.json                      # Vercel deployment config
└── README.md
```

## 🧪 Testing

### Run Tests

```bash
# Local network tests
npm run test

# Sepolia testnet tests
npm run test:sepolia
```

### Test Coverage

```bash
npm run coverage
```

## 🔐 Security Considerations

- **Access Control**: Only recipe owners can decrypt their encrypted data
- **Authorization**: FHEVM's `FHE.allow()` and `FHE.allowThis()` ensure proper access control
- **Encryption Limit**: Maximum 2 encrypted items per recipe (MVP limitation)
- **Pausable**: Contract owner can pause operations in case of emergency
- **Ownership**: Contract uses Ownable pattern for administrative functions

## 📝 Key Design Decisions

1. **MVP Limitation**: Maximum 2 encrypted items per recipe to keep the MVP simple and focused
2. **Selective Encryption**: Chefs can choose which ingredients/steps to encrypt
3. **Owner-Only Decryption**: Only the recipe creator can decrypt their encrypted data
4. **Dual Network Support**: Works on both local Hardhat network and Sepolia testnet
5. **EIP712 Signatures**: Even local network decryption requires EIP712 signatures for consistency

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the BSD-3-Clause-Clear License. See the [LICENSE](LICENSE) file for details.

## 🔗 Resources

- **FHEVM Documentation**: [https://docs.zama.ai/fhevm](https://docs.zama.ai/fhevm)
- **Zama Protocol**: [https://docs.zama.ai/protocol](https://docs.zama.ai/protocol)
- **RainbowKit**: [https://www.rainbowkit.com/](https://www.rainbowkit.com/)
- **Wagmi**: [https://wagmi.sh/](https://wagmi.sh/)

## 🆘 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/PrimaClara23/secret-recipe-keeper/issues)
- **FHEVM Documentation**: [https://docs.zama.ai](https://docs.zama.ai)
- **Community**: [Zama Discord](https://discord.gg/zama)

---

**Built with ❤️ using Zama's FHEVM technology**
