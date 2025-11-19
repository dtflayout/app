import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100">
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">DTF Collage Creator</h1>
          <Button onClick={() => navigate("/auth")}>Get Started</Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Create Professional DTF Print Collages
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Optimize your DTF printing workflow by creating efficient collages.
            Upload your images, arrange them on custom layouts, and maximize your print efficiency.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")}>
              Sign Up Free
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Login
            </Button>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t py-4">
        <div className="container text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} DTF Print Collage Creator
        </div>
      </footer>
    </div>
  );
};

export default Landing;
