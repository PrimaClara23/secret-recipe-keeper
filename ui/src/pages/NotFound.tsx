import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Home, ChefHat } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center px-4"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
        >
          <ChefHat className="h-24 w-24 text-primary mx-auto mb-6" />
        </motion.div>
        
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Recipe Not Found</h2>
        <p className="text-muted-foreground mb-8 max-w-md">
          Looks like this recipe got lost in the kitchen. Let's get you back to the main menu.
        </p>
        
        <Link to="/">
          <Button size="lg" className="gap-2">
            <Home className="h-5 w-5" />
            Back to Home
          </Button>
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
