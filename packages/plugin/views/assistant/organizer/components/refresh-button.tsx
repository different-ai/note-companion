import * as React from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

interface RefreshButtonProps {
  onRefresh: () => void;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({ onRefresh }) => {
  const [loading, setLoading] = React.useState(false);

  const handleRefresh = () => {
    setLoading(true);
    onRefresh();
    // Simulate async operation
    setTimeout(() => {
      setLoading(false);
    }, 2000); // Adjust the timeout as needed
  };

  return (
    <motion.button
      style={{
        boxShadow: "none",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="text-accent px-2 py-1"
      onClick={handleRefresh}
      disabled={loading}
    >
      <motion.div
        animate={{ rotate: loading ? 360 : 0 }}
        transition={{
          duration: 1,
          repeat: loading ? Infinity : 0,
          ease: "linear",
        }}
      >
        <RefreshCw size={18} />
      </motion.div>
      {loading ? "Loading..." : "Refresh"}
    </motion.button>
  );
};

