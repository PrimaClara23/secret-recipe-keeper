import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PageTransition from '@/components/PageTransition';
import { ChefHat, Lock, Shield, Sparkles, ArrowRight, BookOpen, BarChart3 } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useRecipeCount } from '@/hooks/useRecipeContract';

const features = [
  {
    icon: Lock,
    title: 'FHE Encryption',
    description: 'Your secret ingredients are encrypted using fully homomorphic encryption, ensuring complete privacy.',
  },
  {
    icon: Shield,
    title: 'Blockchain Security',
    description: 'All recipes are stored on the blockchain, providing immutable and tamper-proof storage.',
  },
  {
    icon: Sparkles,
    title: 'Selective Decryption',
    description: 'Only you can decrypt your secret ingredients. Share recipes while keeping secrets safe.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const HomePage = () => {
  const { isConnected } = useAccount();
  const { data: recipeCount } = useRecipeCount();

  return (
    <PageTransition>
      <div className="container py-12">
        {/* Hero Section */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center mb-16"
        >
          <motion.div variants={itemVariants} className="mb-6">
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
              }}
              className="inline-block"
            >
              <ChefHat className="h-20 w-20 text-primary mx-auto" />
            </motion.div>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl md:text-6xl font-bold mb-4"
          >
            <span className="text-gradient">Secret Recipe</span>
            <br />
            <span className="text-foreground">Keeper</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8"
          >
            Protect your culinary innovations with fully homomorphic encryption.
            Store recipes on the blockchain while keeping your secret ingredients truly secret.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/recipes">
              <Button size="lg" className="gap-2 gradient-primary text-white">
                <BookOpen className="h-5 w-5" />
                Browse Recipes
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button size="lg" variant="outline" className="gap-2">
                <BarChart3 className="h-5 w-5" />
                View Dashboard
              </Button>
            </Link>
          </motion.div>

          {recipeCount !== undefined && (
            <motion.div
              variants={itemVariants}
              className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary"
            >
              <span className="font-bold text-2xl">{Number(recipeCount)}</span>
              <span className="text-sm">recipes protected on blockchain</span>
            </motion.div>
          )}
        </motion.section>

        {/* Features Section */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mb-16"
        >
          <motion.h2
            variants={itemVariants}
            className="text-2xl font-bold text-center mb-8"
          >
            Why Choose Secret Recipe Keeper?
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div key={index} variants={itemVariants}>
                  <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-primary/10 hover:border-primary/30">
                    <CardContent className="p-6 text-center">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4"
                      >
                        <Icon className="h-7 w-7 text-primary" />
                      </motion.div>
                      <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center"
        >
          <motion.div
            variants={itemVariants}
            className="p-8 rounded-2xl gradient-primary text-white"
          >
            <h2 className="text-2xl font-bold mb-4">Ready to Protect Your Recipes?</h2>
            <p className="mb-6 opacity-90">
              {isConnected
                ? 'Start creating encrypted recipes now!'
                : 'Connect your wallet to get started.'}
            </p>
            {isConnected ? (
              <Link to="/create">
                <Button size="lg" variant="secondary" className="gap-2">
                  Create Your First Recipe
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <p className="text-sm opacity-75">
                Use the Connect button in the header to connect your wallet.
              </p>
            )}
          </motion.div>
        </motion.section>
      </div>
    </PageTransition>
  );
};

export default HomePage;
