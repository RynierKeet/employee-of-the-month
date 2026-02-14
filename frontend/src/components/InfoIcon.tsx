import React from "react";

interface InfoIconProps {
  onClick?: () => void;
  title?: string;
}

export const InfoIcon: React.FC<InfoIconProps> = ({ onClick, title }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title || "More information"}
      className="inline-flex items-center justify-center ml-2 align-middle
                 w-5 h-5 rounded-full border border-[#E8D7B9] bg-white
                 text-[11px] font-semibold text-brandnavy
                 shadow-sm hover:shadow-md hover:bg-[#FFF9F0]
                 transition-colors transition-shadow"
    >
      i
    </button>
  );
};