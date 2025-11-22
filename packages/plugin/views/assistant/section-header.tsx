import * as React from "react";
import { tw } from "@/lib/utils";

interface SectionHeaderProps {
  text: string;
  icon?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ text, icon }) => {
  return (
    <h6 className={tw("text-sm font-medium text-[--text-normal] mb-2")}>
      {icon && <span className={tw("mr-2")}>{icon}</span>}
      {text}
    </h6>
  );
};