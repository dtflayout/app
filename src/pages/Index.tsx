
import React from "react";
import { CollageCreator } from "@/components/CollageCreator";
import { AppHeader } from "@/components/AppHeader";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <AppHeader />
      <main className="flex-1 container px-4 py-8">
        <CollageCreator />
      </main>
      <footer className="bg-white border-t py-4">
        <div className="container text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} DTF Print Collage Creator
        </div>
      </footer>
    </div>
  );
};

export default Index;
