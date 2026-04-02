import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Store, Home, Search } from 'lucide-react';

interface Props {
  type?: 'store' | 'page';
  slug?: string;
}

const StoreNotFound: React.FC<Props> = ({ type = 'store', slug }) => {
  if (type === 'store') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-24 h-24 mx-auto mb-8 bg-gray-200 rounded-full flex items-center justify-center">
            <Store className="w-12 h-12 text-gray-400" />
          </div>

          <h1 className="font-heading text-3xl font-extrabold tracking-tight mb-3">Store Not Found</h1>
          <p className="text-muted-foreground mb-8">
            {slug ? (
              <>
                We couldn&apos;t find a store at{' '}
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                  {slug}.dtflayout.com
                </span>
              </>
            ) : (
              "The store you're looking for doesn't exist or has been removed."
            )}
          </p>

          <div className="bg-white rounded-lg p-6 mb-8 text-left shadow-sm border">
            <h2 className="font-semibold mb-3">This could be because:</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                The store URL was typed incorrectly
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                The store has been deactivated by its owner
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                The store hasn&apos;t been set up yet
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline">
              <a href="https://dtflayout.com">
                <Home className="w-4 h-4 mr-2" />
                Go to DTF Layout
              </a>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-12">
            Powered by{' '}
            <a
              href="https://dtflayout.com"
              className="text-primary hover:underline"
            >
              DTF Layout
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="text-8xl font-bold text-gray-200 mb-4">404</div>

        <h1 className="font-heading text-2xl font-extrabold tracking-tight mb-2">Page Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              Back to Store Home
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/products">
              <Search className="w-4 h-4 mr-2" />
              Browse Products
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StoreNotFound;
