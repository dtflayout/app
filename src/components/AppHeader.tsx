
import React from "react";
import { Pencil, Layers } from "lucide-react";

export const AppHeader = () => {
  return (
    <header className="bg-white border-b shadow-sm">
      <div className="container flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Layers className="h-6 w-6 text-blue-500" />
          <h1 className="text-xl font-bold">Print Collage Creator</h1>
        </div>
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <Pencil className="h-4 w-4" />
          <span>DTF Print Industry Tool</span>
        </div>
      </div>
    </header>
  );
};
