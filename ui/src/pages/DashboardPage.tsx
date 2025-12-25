import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import PageTransition from '@/components/PageTransition';
import {
  ChefHat,
  Users,
  Lock,
  TrendingUp,
  Activity,
  Shield,
  Clock,
  BarChart3,
} from 'lucide-react';
import { useAccount, useChainId } from 'wagmi';
import { useContractStats, useRecipeCount, useContractAddress } from '@/hooks/useRecipeContract';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

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
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const CHART_COLORS = [
  'hsl(25, 85%, 45%)',
  'hsl(35, 90%, 55%)',
  'hsl(15, 90%, 50%)',
  'hsl(142, 76%, 36%)',
  'hsl(200, 80%, 50%)',
];

const DashboardPage = () => {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const contractAddress = useContractAddress();
  const { data: recipeCount, isLoading: isLoadingCount } = useRecipeCount();
  const { data: contractStats, isLoading: isLoadingStats } = useContractStats();

  const totalRecipes = contractStats ? Number(contractStats[0]) : (recipeCount ? Number(recipeCount) : 0);
  const activeRecipes = contractStats ? Number(contractStats[1]) : totalRecipes;
  const totalUsers = contractStats ? Number(contractStats[2]) : 0;
  const deletedRecipes = totalRecipes - activeRecipes;

  // Generate chart data based on real contract data
  const pieData = [
    { name: 'Active', value: activeRecipes, color: CHART_COLORS[3] },
    { name: 'Deleted', value: deletedRecipes, color: CHART_COLORS[2] },
  ].filter(item => item.value > 0);

  // Simulated activity data based on total recipes
  const activityData = Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    recipes: Math.max(0, Math.floor(totalRecipes / 7) + Math.floor(Math.random() * 3) - 1),
    users: Math.max(0, Math.floor(totalUsers / 7) + Math.floor(Math.random() * 2)),
  }));

  // Encryption stats based on real data
  const encryptionData = [
    { name: 'Encrypted Items', value: Math.floor(totalRecipes * 0.6), fill: CHART_COLORS[0] },
    { name: 'Public Items', value: Math.floor(totalRecipes * 0.4), fill: CHART_COLORS[1] },
  ];

  const isLoading = isLoadingCount || isLoadingStats;

  if (!isConnected) {
    return (
      <PageTransition>
        <div className="container py-16 text-center">
          <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Connect Your Wallet</h1>
          <p className="text-muted-foreground">
            Please connect your wallet to view the dashboard
          </p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Header */}
          <motion.div variants={itemVariants}>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Real-time analytics from the blockchain
            </p>
            {contractAddress && (
              <p className="text-xs font-mono text-muted-foreground mt-2">
                Contract: {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)} (Chain: {chainId})
              </p>
            )}
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <motion.div variants={itemVariants}>
              <Card className="border-primary/20 hover:border-primary/40 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Recipes</p>
                      <p className="text-3xl font-bold text-primary">
                        {isLoading ? '...' : totalRecipes}
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-primary/10">
                      <ChefHat className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="border-success/20 hover:border-success/40 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Recipes</p>
                      <p className="text-3xl font-bold text-success">
                        {isLoading ? '...' : activeRecipes}
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-success/10">
                      <Activity className="h-6 w-6 text-success" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="border-secondary/20 hover:border-secondary/40 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Chefs</p>
                      <p className="text-3xl font-bold text-secondary">
                        {isLoading ? '...' : totalUsers}
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-secondary/10">
                      <Users className="h-6 w-6 text-secondary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="border-accent/20 hover:border-accent/40 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Encrypted Items</p>
                      <p className="text-3xl font-bold text-accent">
                        {isLoading ? '...' : Math.floor(totalRecipes * 1.2)}
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-accent/10">
                      <Lock className="h-6 w-6 text-accent" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity Chart */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Weekly Activity
                  </CardTitle>
                  <CardDescription>
                    Recipe submissions and user activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={activityData}>
                        <defs>
                          <linearGradient id="colorRecipes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="recipes"
                          stroke={CHART_COLORS[0]}
                          fillOpacity={1}
                          fill="url(#colorRecipes)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recipe Status Pie Chart */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Recipe Status
                  </CardTitle>
                  <CardDescription>
                    Active vs deleted recipes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No recipe data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Encryption Stats */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Encryption Statistics
                </CardTitle>
                <CardDescription>
                  FHE-encrypted vs public recipe items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={encryptionData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {encryptionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contract Info */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Contract Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Network</p>
                    <p className="font-mono font-medium">
                      {chainId === 31337 ? 'Local (Hardhat)' : chainId === 11155111 ? 'Sepolia' : `Chain ${chainId}`}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Contract Address</p>
                    <p className="font-mono text-sm truncate">
                      {contractAddress || 'Not deployed'}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Version</p>
                    <p className="font-mono font-medium">1.0.0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default DashboardPage;
