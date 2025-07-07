import { LoadingSpinner } from '@/components/loading-spinner';

export default function Loading() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <LoadingSpinner className="h-12 w-12 text-primary" />
    </div>
  );
}
