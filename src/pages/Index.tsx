
import AngryBirdsGame from "@/components/AngryBirdsGame";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-200 to-green-200">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🐦 Angry Birds</h1>
          <p className="text-xl text-gray-600">Launch birds to destroy the green pigs!</p>
        </div>
        <AngryBirdsGame />
      </div>
    </div>
  );
};

export default Index;
