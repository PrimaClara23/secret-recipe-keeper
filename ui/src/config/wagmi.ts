import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";
import { http } from "wagmi";
import { defineChain } from "viem";

// Define localhost chain (Hardhat chainId: 31337)
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

const chains = [localhost, sepolia] as const;

// Use environment variable or fallback
// To avoid 403 errors, register at https://cloud.reown.com and add localhost to allowlist
const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || "YOUR_PROJECT_ID";

export const config = getDefaultConfig({
  appName: "Secret Recipe Keeper",
  projectId,
  chains,
  ssr: false,
  transports: {
    [localhost.id]: http("http://localhost:8545"),
    [sepolia.id]: http("https://rpc.sepolia.org"),
  },
});

export { chains };
