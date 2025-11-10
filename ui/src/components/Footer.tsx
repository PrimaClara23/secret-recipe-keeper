import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';

const Footer = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.random() * 5;
        return next >= 100 ? 0 : next;
      });
    }, 500);

    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="border-t border-border bg-card">
      <div className="container py-6">
        <div className="mb-3">
          <p className="text-sm font-medium text-muted-foreground mb-2">Cooking Progress</p>
          <Progress value={progress} className="h-2" />
        </div>
        <p className="text-xs text-center text-muted-foreground">
          © 2025 Encrypted Recipe Collaboration. All recipes protected.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
