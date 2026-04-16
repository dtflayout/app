import React from "react";
import { Scissors, Pipette, Sparkles, BookOpen, Circle, Replace, RotateCw, Type } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type ToolType = "trim" | "flip-rotate" | "remove-bg" | "replace-color" | "enhance" | "type-text" | "guide" | "create";

interface Tool {
  id: ToolType;
  label: string;
  icon: React.ReactNode;
  bgColor: string;
  enabled: boolean;
  comingSoon?: boolean;
}

const tools: Tool[] = [
  {
    id: "trim",
    label: "Trim",
    icon: <Scissors className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />,
    bgColor: "bg-indigo-500 hover:bg-indigo-600",
    enabled: true,
  },
  {
    id: "flip-rotate",
    label: "Flip / Rotate",
    icon: <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />,
    bgColor: "bg-sky-500 hover:bg-sky-600",
    enabled: true,
  },
  {
    id: "remove-bg",
    label: "Remove Color",
    icon: <Pipette className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />,
    bgColor: "bg-purple-500 hover:bg-purple-600",
    enabled: true,
  },
  {
    id: "replace-color",
    label: "Replace Color",
    icon: <Replace className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />,
    bgColor: "bg-pink-500 hover:bg-pink-600",
    enabled: true,
  },
  {
    id: "enhance",
    label: "Enhance",
    icon: <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />,
    bgColor: "bg-amber-500 hover:bg-amber-600",
    enabled: true,
  },
  {
    id: "type-text",
    label: "Type Text",
    icon: <Type className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />,
    bgColor: "bg-indigo-500 hover:bg-indigo-600",
    enabled: true,
  },
  {
    id: "guide",
    label: "Guide",
    icon: <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />,
    bgColor: "bg-blue-500 hover:bg-blue-600",
    enabled: true,
  },
  {
    id: "create",
    label: "Coming Soon",
    icon: <Circle className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1.5} />,
    bgColor: "bg-gray-200",
    enabled: false,
    comingSoon: true,
  },
];

interface ToolboxProps {
  onToolClick: (toolId: ToolType) => void;
  hasImages: boolean;
  variant?: "default" | "hero";
  /** Tool IDs to hide based on builder settings */
  hiddenTools?: ToolType[];
  /** Override all tool icon colors with a single brand color (hex) */
  iconColor?: string;
}

export const Toolbox: React.FC<ToolboxProps> = ({ onToolClick, hasImages, variant = "default", hiddenTools = [], iconColor }) => {
  const handleClick = (tool: Tool) => {
    if (!tool.enabled) return;
    
    // Guide doesn't need images
    if (tool.id === "guide") {
      onToolClick(tool.id);
      return;
    }
    
    // Other tools need images
    onToolClick(tool.id);
  };

  const isHero = variant === "hero";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center justify-between sm:justify-center gap-0 sm:gap-4 md:gap-6 lg:gap-8 py-2">
        {tools.filter(tool => !hiddenTools.includes(tool.id)).map((tool) => {
          const isDisabled = !tool.enabled;
          const needsImages = tool.id !== "guide" && tool.id !== "type-text" && !hasImages && tool.enabled;
          
          return (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleClick(tool)}
                  disabled={isDisabled}
                  className={`
                    flex flex-col items-center gap-1 sm:gap-1.5 group transition-all duration-300 flex-shrink-0
                    ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}
                  `}
                >
                  {/* Circular icon button */}
                  <div
                    className={`
                      w-9 h-9 sm:w-11 sm:h-11 md:w-[3.25rem] md:h-[3.25rem] rounded-full flex items-center justify-center
                      transition-all duration-300 shadow-md
                      ${isDisabled 
                        ? "bg-gray-200/80 text-gray-400" 
                        : iconColor 
                          ? "text-white hover:scale-110 hover:shadow-lg hover:-translate-y-1 active:scale-95"
                          : `${tool.bgColor} text-white hover:scale-110 hover:shadow-lg hover:-translate-y-1 active:scale-95`
                      }
                    `}
                    style={!isDisabled && iconColor ? { backgroundColor: iconColor } : undefined}
                  >
                    {tool.icon}
                  </div>
                  {/* Label */}
                  <span
                    className={`
                      text-[10px] sm:text-xs font-medium transition-all duration-300 whitespace-pre-line leading-tight text-center
                      ${isDisabled 
                        ? isHero ? "text-white/40" : "text-gray-400" 
                        : isHero 
                          ? "text-white/90 group-hover:text-white" 
                          : "text-gray-500 group-hover:text-gray-700"
                      }
                    `}
                  >
                    {tool.label}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-sm font-medium">
                {tool.comingSoon ? (
                  <span className="text-gray-400">Coming Soon</span>
                ) : needsImages ? (
                  <span className="text-amber-600">Upload images first</span>
                ) : (
                  <span>{tool.label.replace("\n", " ")}</span>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export default Toolbox;
