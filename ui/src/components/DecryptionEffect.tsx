import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Sparkles, Lock, Unlock } from 'lucide-react';

interface DecryptionEffectProps {
  isDecrypting: boolean;
  isDecrypted: boolean;
  decryptedValue?: string | number;
  children: React.ReactNode;
}

const DecryptionEffect = ({
  isDecrypting,
  isDecrypted,
  decryptedValue,
  children,
}: DecryptionEffectProps) => {
  const [showSparkles, setShowSparkles] = useState(false);
  const [scrambledText, setScrambledText] = useState('********');

  useEffect(() => {
    if (isDecrypting) {
      const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?0123456789';
      const interval = setInterval(() => {
        setScrambledText(
          Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        );
      }, 50);

      return () => clearInterval(interval);
    }
  }, [isDecrypting]);

  useEffect(() => {
    if (isDecrypted) {
      setShowSparkles(true);
      const timer = setTimeout(() => setShowSparkles(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [isDecrypted]);

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {isDecrypting ? (
          <motion.div
            key="decrypting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Lock className="h-4 w-4 text-primary" />
            </motion.div>
            <motion.span
              className="font-mono text-primary"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              {scrambledText}
            </motion.span>
          </motion.div>
        ) : isDecrypted ? (
          <motion.div
            key="decrypted"
            initial={{ scale: 0.8, opacity: 0, filter: "blur(10px)" }}
            animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
            transition={{
              duration: 0.6,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative"
          >
            <motion.div
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-2"
            >
              <Unlock className="h-4 w-4 text-success" />
              <span className="font-semibold text-success">{decryptedValue}</span>
            </motion.div>

            {/* Sparkle effects */}
            <AnimatePresence>
              {showSparkles && (
                <>
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{
                        scale: 0,
                        x: 0,
                        y: 0,
                        opacity: 1,
                      }}
                      animate={{
                        scale: [0, 1, 0],
                        x: (Math.random() - 0.5) * 100,
                        y: (Math.random() - 0.5) * 100,
                        opacity: [1, 1, 0],
                      }}
                      transition={{
                        duration: 0.8,
                        delay: i * 0.1,
                        ease: "easeOut",
                      }}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    >
                      <Sparkles className="h-4 w-4 text-warning" />
                    </motion.div>
                  ))}
                </>
              )}
            </AnimatePresence>

            {/* Glow ring effect */}
            <motion.div
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 rounded-full border-2 border-success pointer-events-none"
            />
          </motion.div>
        ) : (
          <motion.div
            key="locked"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DecryptionEffect;
