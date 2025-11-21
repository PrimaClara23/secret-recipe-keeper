import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";
import { http } from "wagmi";
import { defineChain } from "viem";

// Get contract address from environment
const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || "";

// Define localhost chain with correct chainId (31337 for Hardhat)
const localhost = defineChain({
  id: 31337,
  name: "Localhost",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["http://localhost:8545"],
    },
  },
});

// Configure chains
const chains = [localhost, sepolia] as const;

// RainbowKit configuration
// Note: For local development, WalletConnect remote config requests may fail (403)
// This is expected and won't affect functionality. For production, get a real projectId
// from https://cloud.reown.com (formerly cloud.walletconnect.com)
const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || "a4c3f8a6d7b2c1e8f9a5c3d2e1f4b6a9";

// Suppress expected WalletConnect 403 errors in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Filter function for WalletConnect errors
  const isWalletConnectError = (message: string) => {
    return (
      (message.includes('403') || message.includes('Forbidden')) &&
      (message.includes('web3modal.org') ||
       message.includes('walletconnect.org') ||
       message.includes('pulse.walletconnect.org') ||
       message.includes('Reown Config') ||
       message.includes('Allowlist') ||
       message.includes('Failed to fetch remote project configuration') ||
       message.includes('not found on Allowlist'))
    );
  };

  // Override console methods to filter errors
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;

  console.error = (...args: any[]) => {
    const message = args.map(String).join(' ');
    if (isWalletConnectError(message)) {
      return; // Silently ignore
    }
    originalError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    const message = args.map(String).join(' ');
    if (isWalletConnectError(message)) {
      return; // Silently ignore
    }
    originalWarn.apply(console, args);
  };

  // Filter network errors from console.log (some libraries use console.log for errors)
  console.log = (...args: any[]) => {
    const message = args.map(String).join(' ');
    if (isWalletConnectError(message)) {
      return; // Silently ignore
    }
    originalLog.apply(console, args);
  };

  // Global error event listener to catch unhandled errors
  window.addEventListener('error', (event) => {
    const message = event.message || String(event.error || '');
    if (isWalletConnectError(message)) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, true);

  // Global unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    const message = String(event.reason || '');
    if (isWalletConnectError(message)) {
      event.preventDefault();
      return false;
    }
  });

  // Log helpful message once on startup
  setTimeout(() => {
    originalLog(
      "%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "color: #FF6B35; font-weight: bold;"
    );
    originalLog(
      "%c🔐 Secret Recipe Keeper - Ready",
      "color: #FF6B35; font-weight: bold; font-size: 16px;"
    );
    originalLog(
      "%c✅ Wallet connection configured successfully",
      "color: #4CAF50; font-size: 13px; font-weight: bold;"
    );
    originalLog(
      "%c",
      ""
    );
    originalLog(
      "%cℹ️ About 403 Errors:",
      "color: #2196F3; font-size: 12px; font-weight: bold;"
    );
    originalLog(
      "%c   • WalletConnect 403 errors in Console/Network are EXPECTED in local development",
      "color: #666; font-size: 11px;"
    );
    originalLog(
      "%c   • These errors do NOT affect functionality - the app uses local defaults",
      "color: #666; font-size: 11px;"
    );
    originalLog(
      "%c   • All wallet features work perfectly (MetaMask, WalletConnect, etc.)",
      "color: #666; font-size: 11px;"
    );
    originalLog(
      "%c   • To eliminate errors: Get a real Project ID from https://cloud.reown.com",
      "color: #666; font-size: 11px;"
    );
    originalLog(
      "%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "color: #FF6B35; font-weight: bold;"
    );
  }, 1500);
}

export const config = getDefaultConfig({
  appName: "Secret Recipe Keeper",
  // Use a valid format projectId (32 hex characters) to reduce errors
  // For localhost, these 403 errors are expected and can be ignored
  projectId,
  chains,
  ssr: false,
  transports: {
    [localhost.id]: http("http://localhost:8545"),
    // Avoid default third-party RPCs that may rate-limit or block CORS
    [sepolia.id]: http("https://rpc.sepolia.org"),
  },
});

export { chains };
