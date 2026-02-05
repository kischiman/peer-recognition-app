import React, { useState, useEffect } from 'react';
import { User, Calendar, Clock } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  chapterId: string;
}

interface Chapter {
  id: string;
  title: string;
  duration: string;
  participants: string[];
  status: 'setup' | 'contribution' | 'distribution' | 'finished';
  startTime?: Date;
  endTime?: Date;
  contributionDeadline?: Date;
  distributionDeadline?: Date;
  createdAt: Date;
}

interface Props {
  onLogin: (participant: Participant) => void;
}

export default function ParticipantLogin({ onLogin }: Props) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChapters();
  }, []);

  useEffect(() => {
    if (selectedChapter) {
      fetchParticipants(selectedChapter);
    } else {
      setParticipants([]);
      setSelectedParticipant('');
    }
  }, [selectedChapter]);

  const fetchChapters = async () => {
    try {
      const response = await fetch('/api/epochs/all');
      const chaptersData = await response.json();
      
      // Filter for active chapters (not finished)
      const activeChapters = chaptersData.filter((chapter: Chapter) => 
        chapter.status !== 'finished'
      );
      
      setChapters(activeChapters);
      
      // Auto-select if there's only one active chapter
      if (activeChapters.length === 1) {
        setSelectedChapter(activeChapters[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch chapters:', error);
    }
    setLoading(false);
  };

  const fetchParticipants = async (chapterId: string) => {
    try {
      const participantsResponse = await fetch(`/api/epochs/${chapterId}/participants`);
      const participantsData = await participantsResponse.json();
      setParticipants(participantsData);
    } catch (error) {
      console.error('Failed to fetch participants:', error);
    }
  };

  const handleLogin = () => {
    const participant = participants.find(p => p.id === selectedParticipant);
    if (participant) {
      onLogin(participant);
    }
  };

  const formatRemainingTime = (deadline: Date | string): string => {
    const end = new Date(deadline).getTime();
    const now = new Date().getTime();
    const diff = end - now;
    
    if (diff <= 0) return 'Deadline passed';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h remaining`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Active Chapters</h2>
          <p className="text-gray-600">There are no active chapters at the moment. Please check with your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Join Contribution Session</h2>
          <p className="text-gray-600 mt-2">Select your name to participate</p>
        </div>

        {/* Session Workflow Overview */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">How This Session Works</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <div>
                  <span className="font-medium text-blue-900">Write about each team member&apos;s contributions</span>
                  {selectedChapter && chapters.find(c => c.id === selectedChapter)?.contributionDeadline && (
                    <div className="text-blue-700 text-xs mt-1 flex items-center space-x-2">
                      <Clock className="w-3 h-3" />
                      <span>
                        {new Date(chapters.find(c => c.id === selectedChapter)?.contributionDeadline!).toLocaleDateString()} at {new Date(chapters.find(c => c.id === selectedChapter)?.contributionDeadline!).toLocaleTimeString()}
                      </span>
                      <span className="font-semibold">
                        ({formatRemainingTime(chapters.find(c => c.id === selectedChapter)?.contributionDeadline!)})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <div>
                <div>
                  <span className="font-medium text-blue-900">Assign 100 points across all contributions</span>
                  {selectedChapter && chapters.find(c => c.id === selectedChapter)?.distributionDeadline && (
                    <div className="text-blue-700 text-xs mt-1 flex items-center space-x-2">
                      <Clock className="w-3 h-3" />
                      <span>
                        {new Date(chapters.find(c => c.id === selectedChapter)?.distributionDeadline!).toLocaleDateString()} at {new Date(chapters.find(c => c.id === selectedChapter)?.distributionDeadline!).toLocaleTimeString()}
                      </span>
                      <span className="font-semibold">
                        ({formatRemainingTime(chapters.find(c => c.id === selectedChapter)?.distributionDeadline!)})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <div>
                <span className="font-medium text-blue-900">See the results</span>
                {selectedChapter && (
                  <div className="text-blue-700 text-xs mt-1">
                    <a href={`/results?chapterId=${selectedChapter}`} className="underline hover:text-blue-800">
                      View results page →
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {chapters.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Chapter
              </label>
              <select
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a chapter...</option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.title} ({chapter.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedChapter && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Your Name
              </label>
              <select
                value={selectedParticipant}
                onChange={(e) => setSelectedParticipant(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose your name...</option>
                {participants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={!selectedParticipant || !selectedChapter}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Enter Session
          </button>
        </div>
      </div>
    </div>
  );
}