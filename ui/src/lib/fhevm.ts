// FHEVM SDK utilities for frontend
import { ethers, JsonRpcProvider } from "ethers";

// Import @zama-fhe/relayer-sdk (dynamic import for Sepolia only)
// For localhost, we use @fhevm/mock-utils instead
let createInstance: any = null;
let initSDK: any = null;
let SepoliaConfig: any = null;
type FhevmInstance = any;

// Import @fhevm/mock-utils for localhost mock FHEVM
let MockFhevmInstance: any = null;
let userDecryptHandleBytes32: any = null;

export interface EncryptedInput {
  handles: string[];
  inputProof: string;
}

let fhevmInstance: FhevmInstance | null = null;
let isSDKInitialized = false;
let lastChainId: number | null = null; // Track the chainId used to create fhevmInstance

/**
 * Initialize FHEVM instance
 * Local network (31337): Uses @fhevm/mock-utils + Hardhat plugin
 * Sepolia (11155111): Uses @zama-fhe/relayer-sdk
 */
export async function initializeFHEVM(chainId?: number): Promise<FhevmInstance> {
  // Check window.ethereum
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("window.ethereum is not available. Please install MetaMask.");
  }

  // Get chainId first
  let currentChainId = chainId;
  if (!currentChainId) {
    try {
      const chainIdHex = await (window as any).ethereum.request({ method: "eth_chainId" });
      currentChainId = parseInt(chainIdHex, 16);
    } catch (error) {
      console.error("[FHEVM] Failed to get chainId:", error);
      currentChainId = 31337;
    }
  }

  console.log("[FHEVM] Current chain ID:", currentChainId);

  // If fhevmInstance exists but chainId changed, reset it
  if (fhevmInstance && lastChainId !== null && lastChainId !== currentChainId) {
    console.log(`[FHEVM] Chain ID changed from ${lastChainId} to ${currentChainId}. Resetting FHEVM instance...`);
    fhevmInstance = null;
    lastChainId = null;
    // Reset SDK initialization flag if switching from Sepolia
    if (lastChainId === 11155111) {
      isSDKInitialized = false;
    }
  }

  if (!fhevmInstance) {
    // Check window.ethereum
    if (typeof window === "undefined" || !(window as any).ethereum) {
      throw new Error("window.ethereum is not available. Please install MetaMask.");
    }

    // Get chainId first
    let currentChainId = chainId;
    if (!currentChainId) {
      try {
        const chainIdHex = await (window as any).ethereum.request({ method: "eth_chainId" });
        currentChainId = parseInt(chainIdHex, 16);
      } catch (error) {
        console.error("[FHEVM] Failed to get chainId:", error);
        currentChainId = 31337;
      }
    }

    console.log("[FHEVM] Current chain ID:", currentChainId);

    // Initialize SDK for Sepolia only
    if (currentChainId === 11155111 && !isSDKInitialized) {
      console.log("[FHEVM] Initializing FHE SDK for Sepolia...");
      
      try {
        // Dynamically import Sepolia SDK only when needed
        if (!createInstance || !initSDK || !SepoliaConfig) {
          const sdk = await import("@zama-fhe/relayer-sdk/bundle");
          createInstance = sdk.createInstance;
          initSDK = sdk.initSDK;
          SepoliaConfig = sdk.SepoliaConfig;
        }
        
        if (initSDK) {
          await initSDK();
          isSDKInitialized = true;
          console.log("[FHEVM] ✅ SDK initialized successfully");
        }
      } catch (error: any) {
        console.error("[FHEVM] SDK initialization failed:", error);
        console.warn("[FHEVM] Continuing with createInstance...");
      }
    }

    // Local network: Use Mock FHEVM
    if (currentChainId === 31337) {
      const localhostRpcUrl = "http://localhost:8545";
      
      try {
        console.log("[FHEVM] Fetching FHEVM metadata from Hardhat node...");
        const provider = new JsonRpcProvider(localhostRpcUrl);
        const metadata = await provider.send("fhevm_relayer_metadata", []);
        
        console.log("[FHEVM] Metadata:", metadata);
        
        if (metadata && metadata.ACLAddress && metadata.InputVerifierAddress && metadata.KMSVerifierAddress) {
          // Use @fhevm/mock-utils to create mock instance
          if (!MockFhevmInstance || !userDecryptHandleBytes32) {
            const mockUtils = await import("@fhevm/mock-utils");
            MockFhevmInstance = mockUtils.MockFhevmInstance;
            userDecryptHandleBytes32 = mockUtils.userDecryptHandleBytes32;
            console.log("[FHEVM] ✅ Loaded mock-utils");
          }
          
          console.log("[FHEVM] Creating MockFhevmInstance...");
          
          const mockInstance = await MockFhevmInstance.create(provider, provider, {
            aclContractAddress: metadata.ACLAddress,
            chainId: 31337,
            gatewayChainId: 55815,
            inputVerifierContractAddress: metadata.InputVerifierAddress,
            kmsContractAddress: metadata.KMSVerifierAddress,
            verifyingContractAddressDecryption: "0x5ffdaAB0373E62E2ea2944776209aEf29E631A64",
            verifyingContractAddressInputVerification: "0x812b06e1CDCE800494b79fFE4f925A504a9A9810",
          });
          
          console.log("[FHEVM] Mock instance created:", {
            constructor: mockInstance.constructor?.name,
            type: typeof mockInstance,
            hasGenerateKeypair: typeof mockInstance.generateKeypair === 'function',
          });
          
          // Add generateKeypair method if it doesn't exist
          // userDecryptHandleBytes32 internally needs this method in _resolveUserDecryptOptions
          if (typeof mockInstance.generateKeypair !== 'function') {
            console.log("[FHEVM] Adding generateKeypair method to Mock instance...");
            (mockInstance as any).generateKeypair = () => {
              // Return a mock keypair for local network
              // This is needed by userDecryptHandleBytes32 internally
              return {
                publicKey: new Uint8Array(32).fill(0),
                privateKey: new Uint8Array(32).fill(0),
              };
            };
            console.log("[FHEVM] ✅ Added generateKeypair method to Mock instance");
          }
          
          fhevmInstance = mockInstance;
          lastChainId = currentChainId;
          console.log("[FHEVM] ✅ Mock FHEVM instance created successfully!");
          return mockInstance;
        } else {
          throw new Error("FHEVM metadata is incomplete");
        }
      } catch (error: any) {
        console.error("[FHEVM] Failed to create Mock instance:", error);
        throw new Error(
          `Local Hardhat node FHEVM initialization failed: ${error.message}\n\n` +
          `Please ensure:\n` +
          `1. Hardhat node is running (npx hardhat node)\n` +
          `2. @fhevm/hardhat-plugin is imported in hardhat.config.ts\n` +
          `3. Restart Hardhat node and retry`
        );
      }
    }
    
    // Sepolia network: Use official SDK with MetaMask provider to avoid CORS
    else if (currentChainId === 11155111) {
      try {
        console.log("[FHEVM] Creating Sepolia FHEVM instance...");
        
        if (typeof window === "undefined" || !(window as any).ethereum) {
          throw new Error("MetaMask not detected. Please install MetaMask to use Sepolia network.");
        }
        
        // Dynamically import Sepolia SDK if not already loaded
        if (!createInstance || !SepoliaConfig) {
          const sdk = await import("@zama-fhe/relayer-sdk/bundle");
          createInstance = sdk.createInstance;
          initSDK = sdk.initSDK;
          SepoliaConfig = sdk.SepoliaConfig;
        }
        
        // Initialize SDK if not already initialized
        if (!isSDKInitialized && initSDK) {
          try {
            await initSDK();
            isSDKInitialized = true;
            console.log("[FHEVM] ✅ SDK initialized successfully");
          } catch (initError: any) {
            console.warn("[FHEVM] SDK initialization failed, continuing:", initError);
          }
        }
        
        // Create config using MetaMask provider (no CORS issues)
        const config = {
          ...SepoliaConfig,
          network: (window as any).ethereum,  // Use MetaMask provider
        };
        
        fhevmInstance = await createInstance(config);
        lastChainId = currentChainId;
        console.log("[FHEVM] ✅ Sepolia FHEVM instance created successfully!");
      } catch (error: any) {
        console.error("[FHEVM] ❌ Sepolia instance creation failed:", error);
        throw new Error(
          `Failed to create Sepolia FHEVM instance: ${error.message || "Unknown error"}`
        );
      }
    }
    
    else {
      throw new Error(`Unsupported network (Chain ID: ${currentChainId}). Please switch to local network (31337) or Sepolia (11155111).`);
    }
  }
  
  return fhevmInstance;
}

/**
 * Get or initialize FHEVM instance
 */
export async function getFHEVMInstance(chainId?: number): Promise<FhevmInstance> {
  return initializeFHEVM(chainId);
}

/**
 * Encrypt input data (for ingredient amounts)
 */
export async function encryptInput(
  fhevm: FhevmInstance,
  contractAddress: string,
  userAddress: string,
  value: number
): Promise<EncryptedInput> {
  if (!fhevm || typeof fhevm.createEncryptedInput !== 'function') {
    throw new Error("Invalid FHEVM instance: createEncryptedInput method not available");
  }

  if (!contractAddress || !contractAddress.startsWith('0x')) {
    throw new Error("Invalid contract address format");
  }

  if (!userAddress || !userAddress.startsWith('0x')) {
    throw new Error("Invalid user address format");
  }

  if (typeof value !== 'number' || isNaN(value) || value < 0) {
    throw new Error("Value must be a non-negative number");
  }

  try {
    const encryptedInput = fhevm
      .createEncryptedInput(contractAddress, userAddress)
      .add32(value);

    const encrypted = await encryptedInput.encrypt();

    if (!encrypted || !encrypted.handles || encrypted.handles.length === 0) {
      throw new Error("Encryption returned invalid result: no handles");
    }

    if (!encrypted.inputProof) {
      throw new Error("Encryption returned invalid result: no input proof");
    }

    const handles = encrypted.handles.map(handle => {
      const hexHandle = ethers.hexlify(handle);
      if (hexHandle.length < 66) {
        const padded = hexHandle.slice(2).padStart(64, '0');
        return `0x${padded}`;
      }
      if (hexHandle.length > 66) {
        return hexHandle.slice(0, 66);
      }
      return hexHandle;
    });

    return {
      handles,
      inputProof: ethers.hexlify(encrypted.inputProof),
    };
  } catch (error: any) {
    console.error("[FHEVM] Encryption failed:", error);
    throw new Error(`Encryption failed: ${error.message || "Unknown error"}`);
  }
}

/**
 * Validate network compatibility for FHEVM operations
 */
export function validateNetworkForFHEVM(chainId: number): boolean {
  return chainId === 31337 || chainId === 11155111;
}

/**
 * Get network name for display
 */
export function getNetworkName(chainId: number): string {
  switch (chainId) {
    case 31337:
      return "Local Hardhat";
    case 11155111:
      return "Sepolia Testnet";
    default:
      return `Chain ${chainId}`;
  }
}

/**
 * Decrypt euint32 value (single value)
 */
export async function decryptEuint32(
  fhevm: FhevmInstance,
  handle: string,
  contractAddress: string,
  userAddress: string,
  signer: any,
  chainId?: number
): Promise<number> {
  // Validate handle format
  if (!handle || handle === "0x" || handle.length !== 66) {
    throw new Error(`Invalid handle format: ${handle}. Expected 66 characters (0x + 64 hex chars)`);
  }

  console.log('[decryptEuint32] Starting decryption with:', {
    chainId,
    chainIdType: typeof chainId,
    handle: handle.substring(0, 20) + '...',
    contractAddress,
    userAddress,
    fhevmType: typeof fhevm,
    fhevmHasGenerateKeypair: fhevm && typeof fhevm.generateKeypair === 'function',
  });

  const isLocalNetwork = chainId === 31337;
  const isSepoliaNetwork = chainId === 11155111;
  
  console.log('[decryptEuint32] Network detection:', {
    isLocalNetwork,
    isSepoliaNetwork,
    chainId,
  });
  
  if (isLocalNetwork) {
    console.log('[decryptEuint32] Using LOCAL network decryption (Mock) - following privateself pattern');
    
    // Get Mock instance (following privateself project pattern)
    const mockInstance = fhevm || await getFHEVMInstance(chainId);
    
    if (!mockInstance) {
      throw new Error("Mock FHEVM instance not available for local network");
    }
    
    console.log('[decryptEuint32] Mock instance methods:', {
      hasGenerateKeypair: typeof mockInstance.generateKeypair === 'function',
      hasUserDecrypt: typeof mockInstance.userDecrypt === 'function',
      methods: Object.getOwnPropertyNames(Object.getPrototypeOf(mockInstance)),
    });
    
    const result = await mockInstance.userDecrypt(
      [{ handle, contractAddress }],
      new Uint8Array(32).fill(0),
      new Uint8Array(32).fill(0),
      "",
      [contractAddress],
      userAddress,
      Math.floor(Date.now() / 1000).toString(),
      "10"
    );
    
    const value = result[handle];
    if (value === undefined) {
      throw new Error(`Decryption failed: No value returned for handle ${handle}`);
    }
    
    console.log('[Decrypt] Decrypted value:', value);
    return Number(value);
  } else if (isSepoliaNetwork) {
    console.log('[decryptEuint32] Using SEPOLIA network decryption (FHEVM SDK)');
    
    // For Sepolia network, use userDecrypt with signature
    // Check if fhevm instance has generateKeypair method (Sepolia FHEVM instance)
    console.log('[decryptEuint32] Checking FHEVM instance type:', {
      fhevmExists: !!fhevm,
      fhevmType: typeof fhevm,
      hasGenerateKeypair: fhevm && typeof fhevm.generateKeypair === 'function',
      fhevmKeys: fhevm ? Object.keys(fhevm).slice(0, 10) : [],
    });
    
    if (!fhevm) {
      throw new Error(
        `FHEVM instance is null or undefined. ` +
        `Please ensure you're connected to Sepolia network (Chain ID: 11155111) and FHEVM is properly initialized.`
      );
    }
    
    if (typeof fhevm.generateKeypair !== 'function') {
      console.error('[decryptEuint32] FHEVM instance does not have generateKeypair method:', {
        fhevmType: typeof fhevm,
        fhevmConstructor: fhevm.constructor?.name,
        fhevmMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(fhevm)),
        fhevmKeys: Object.keys(fhevm).slice(0, 20),
      });
      throw new Error(
        `Invalid FHEVM instance for Sepolia network. ` +
        `Expected Sepolia FHEVM instance with generateKeypair method, ` +
        `but got instance of type: ${fhevm.constructor?.name || typeof fhevm}. ` +
        `This usually means you're using a Mock FHEVM instance on Sepolia network, or vice versa. ` +
        `Please ensure you're connected to Sepolia network (Chain ID: 11155111) and FHEVM is properly initialized. ` +
        `Current chainId: ${chainId}`
      );
    }
    
    console.log('[decryptEuint32] Calling fhevm.generateKeypair()...');
    const keypair = fhevm.generateKeypair();
    const contractAddresses = [contractAddress];
    
    const startTimeStamp = Math.floor(Date.now() / 1000).toString();
    const durationDays = "10";
    
    const eip712 = fhevm.createEIP712(
      keypair.publicKey,
      contractAddresses,
      startTimeStamp,
      durationDays
    );
    
    const signature = await signer.signTypedData(
      eip712.domain,
      { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
      eip712.message
    );
    
    const result = await fhevm.userDecrypt(
      [{ handle, contractAddress }],
      keypair.privateKey,
      keypair.publicKey,
      signature.replace("0x", ""),
      contractAddresses,
      userAddress,
      startTimeStamp,
      durationDays
    );
    
    return Number(result[handle] || 0);
  } else {
    throw new Error(
      `Unsupported network for decryption. ChainId: ${chainId}. ` +
      `Supported networks: Local (31337) or Sepolia (11155111). ` +
      `Current chainId: ${chainId || 'undefined'}`
    );
  }
}

/**
 * Reset FHEVM instance (for network switching)
 */
export function resetFHEVMInstance() {
  fhevmInstance = null;
  lastChainId = null;
  console.log("[FHEVM] Instance and chainId tracking reset");
}

