import { motion } from "framer-motion";
import { FC } from "react";

type FloatingIconProps = {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  x: string;
  y: string;
  delay?: number;
};

const FloatingIcon: FC<FloatingIconProps> = ({ icon: Icon, x, y, delay = 0 }) => (
  <motion.div
    className={`absolute ${x} ${y} hidden md:block`}
    initial={{ opacity: 0, y: 20 }}
    animate={{
      opacity: [0.3, 0.7, 0.3],
      y: [0, -12, 0],
      rotate: [0, 8, -8, 0],
    }}
    transition={{
      duration: 6,
      delay,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  >
    <Icon className="w-10 h-10 text-blue-300/60 drop-shadow-lg" />
  </motion.div>
);


export default FloatingIcon