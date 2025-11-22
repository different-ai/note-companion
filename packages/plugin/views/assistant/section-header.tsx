import * as React from "react";
import { tw } from "@/lib/utils";

interface SectionHeaderProps {
  text: string;
  icon?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ text, icon }) => {
  return (
    <h6 className={tw("text-xs font-semibold text-[--text-muted] uppercase tracking-wide mt-5 mb-2 px-3")}>
      {icon && <span className={tw("mr-1.5")}>{icon}</span>}
      {text}
    </h6>
  );
};