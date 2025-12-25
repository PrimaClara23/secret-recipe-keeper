import { ChefHat, Github, Twitter, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ChefHat className="h-6 w-6 text-primary" />
              <span className="font-bold text-foreground">Secret Recipe Keeper</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Protect your culinary innovations with fully homomorphic encryption on the blockchain.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Security</h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-success" />
              <span>FHE-Protected Data</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Your secret ingredients are encrypted using Zama's FHEVM technology.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Connect</h4>
            <div className="flex items-center gap-4">
              <motion.a
                href="#"
                whileHover={{ scale: 1.1 }}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Github className="h-5 w-5" />
              </motion.a>
              <motion.a
                href="#"
                whileHover={{ scale: 1.1 }}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </motion.a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-center text-muted-foreground">
            &copy; 2025 Secret Recipe Keeper. All recipes protected with FHE encryption.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
