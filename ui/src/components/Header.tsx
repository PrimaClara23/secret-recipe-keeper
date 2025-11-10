import { ConnectButton } from '@rainbow-me/rainbowkit';

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Secret Recipe Keeper Logo" className="h-10 w-10" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Secret Recipe Keeper</h1>
            <p className="text-xs text-muted-foreground">Protect Your Culinary Secrets with FHE</p>
          </div>
        </div>
        <ConnectButton />
      </div>
    </header>
  );
};

export default Header;
