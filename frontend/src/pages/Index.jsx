import { useAuth } from '@/context/AuthContext';
import Dashboard from '@/views/Dashboard/Dashboard';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <main className="flex-1 p-6">
          <Dashboard />
        </main>
      </div>
    </div>
  );
};

export default Index;
