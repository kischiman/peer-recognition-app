import React, { useState, useEffect } from 'react';
import ResultsDashboard from '../components/ResultsDashboard';
import { ArrowLeft, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface Epoch {
  id: string;
  title: string;
  status: 'setup' | 'contribution' | 'distribution' | 'finished';
  duration: string;
  participants: string[];
  startTime?: Date;
  endTime?: Date;
  createdAt: Date;
}

export default function ResultsPage() {
  const router = useRouter();
  const [epochs, setEpochs] = useState<Epoch[]>([]);
  const [selectedEpoch, setSelectedEpoch] = useState<string | null>(null);
  const [currentEpoch, setCurrentEpoch] = useState<Epoch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEpochs();
  }, []);

  useEffect(() => {
    // Check for epochId in URL query params
    const { epochId } = router.query;
    if (epochId && typeof epochId === 'string') {
      setSelectedEpoch(epochId);
    }
  }, [router.query]);

  useEffect(() => {
    if (selectedEpoch) {
      const epoch = epochs.find(e => e.id === selectedEpoch);
      setCurrentEpoch(epoch || null);
    } else if (epochs.length > 0) {
      // Default to latest epoch if no specific epoch selected
      const latestEpoch = epochs[0]; // Already sorted by date
      setCurrentEpoch(latestEpoch);
      setSelectedEpoch(latestEpoch.id);
    }
  }, [selectedEpoch, epochs]);

  const fetchEpochs = async () => {
    try {
      const response = await fetch('/api/epochs/all');
      const epochsData = await response.json();
      
      // Filter for epochs that have results (distribution or finished)
      const epochsWithResults = epochsData.filter((epoch: Epoch) => 
        epoch.status === 'distribution' || epoch.status === 'finished'
      );
      
      setEpochs(epochsWithResults);
    } catch (error) {
      console.error('Failed to fetch epochs:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (epochs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Results Available</h2>
          <p className="text-gray-600 mb-6">There are no epochs with results to display yet.</p>
          <Link 
            href="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Results Dashboard</h1>
              {currentEpoch && (
                <p className="text-sm text-gray-600">
                  {currentEpoch.title} • Status: {currentEpoch.status === 'finished' ? 'Completed' : 'In Progress'}
                </p>
              )}
            </div>
            
            <Link 
              href="/"
              className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {epochs.length > 1 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center space-x-4">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Epoch to View Results
                </label>
                <select
                  value={selectedEpoch || ''}
                  onChange={(e) => setSelectedEpoch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {epochs.map((epoch) => (
                    <option key={epoch.id} value={epoch.id}>
                      {epoch.title} ({epoch.status}) - {new Date(epoch.createdAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {currentEpoch && (currentEpoch.status === 'distribution' || currentEpoch.status === 'finished') ? (
          <ResultsDashboard epochId={currentEpoch.id} />
        ) : currentEpoch ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Results Not Yet Available
            </h2>
            <p className="text-gray-600">
              Results will be available once the distribution phase starts for {currentEpoch.title}.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Select an Epoch
            </h2>
            <p className="text-gray-600">
              Choose an epoch from the dropdown above to view its results.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}