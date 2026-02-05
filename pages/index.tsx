import React, { useState, useEffect } from 'react';
import AdminPanel from '../components/AdminPanel';
import ParticipantLogin from '../components/ParticipantLogin';
import CircleView from '../components/CircleView';
import DistributionView from '../components/DistributionView';
import ResultsDashboard from '../components/ResultsDashboard';
import { Settings, Users, BarChart3 } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  chapterId: string;
}

interface Epoch {
  id: string;
  title: string;
  status: 'setup' | 'contribution' | 'distribution' | 'finished';
  contributionEndTime?: Date;
  distributionEndTime?: Date;
}

export default function Home() {
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [currentEpoch, setCurrentEpoch] = useState<Epoch | null>(null);
  const [view, setView] = useState<'participant' | 'admin'>('participant');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEpoch();
    
    // Periodic fetch of epoch data
    const epochInterval = setInterval(fetchEpoch, 10000);
    
    // Periodic auto-transition check
    const transitionInterval = setInterval(async () => {
      try {
        await fetch('/api/epochs/auto-transition', { method: 'POST' });
      } catch (error) {
        console.error('Auto-transition check failed:', error);
      }
    }, 30000); // Check every 30 seconds
    
    return () => {
      clearInterval(epochInterval);
      clearInterval(transitionInterval);
    };
  }, []);

  const fetchEpoch = async () => {
    try {
      const response = await fetch('/api/epochs');
      const epoch = await response.json();
      setCurrentEpoch(epoch);
    } catch (error) {
      console.error('Failed to fetch epoch:', error);
    }
    setLoading(false);
  };

  const handleLogin = (participant: Participant) => {
    setCurrentParticipant(participant);
  };

  const handleLogout = () => {
    setCurrentParticipant(null);
  };

  const renderParticipantView = () => {
    if (!currentParticipant) {
      return <ParticipantLogin onLogin={handleLogin} />;
    }

    if (!currentEpoch) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Active Epoch</h2>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Back to Login
            </button>
          </div>
        </div>
      );
    }

    if (currentEpoch.status === 'distribution') {
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="bg-white shadow-sm border-b">
            <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{currentEpoch.title}</h1>
                <p className="text-sm text-gray-600">
                  Welcome, {currentParticipant.name} • Distribution Phase
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
          
          <div className="max-w-6xl mx-auto p-6">
            <DistributionView 
              currentParticipant={currentParticipant}
              epochId={currentEpoch.id}
              epoch={currentEpoch}
            />
          </div>
        </div>
      );
    }

    if (currentEpoch.status === 'finished') {
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="bg-white shadow-sm border-b">
            <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{currentEpoch.title}</h1>
                <p className="text-sm text-gray-600">
                  Welcome, {currentParticipant.name} • Epoch Finished
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
          
          <div className="max-w-6xl mx-auto p-6">
            <ResultsDashboard epochId={currentEpoch.id} />
          </div>
        </div>
      );
    }

    return (
      <CircleView 
        currentParticipant={currentParticipant}
        onLogout={handleLogout}
      />
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Peer Recognition App
            </h1>
            
            <div className="flex space-x-4">
              <button
                onClick={() => setView('participant')}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  view === 'participant'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Users className="w-4 h-4 mr-2" />
                Participant
              </button>
              
              <button
                onClick={() => setView('admin')}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  view === 'admin'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </button>

              {currentEpoch?.status === 'finished' && (
                <button
                  onClick={() => window.location.href = '/results'}
                  className="flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Results
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {view === 'admin' ? <AdminPanel /> : renderParticipantView()}
    </div>
  );
}