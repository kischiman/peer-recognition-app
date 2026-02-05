import React, { useState, useEffect } from 'react';
import { Gift, Save, RotateCcw } from 'lucide-react';
import CountdownTimer from './CountdownTimer';
import { getPhaseEndTime } from '../lib/timer-utils';

interface Participant {
  id: string;
  name: string;
  chapterId: string;
}

interface Contribution {
  id: string;
  participantId: string; // who the contribution is ABOUT
  authorId: string; // who WROTE the description
  epochId: string;
  description: string;
  createdAt: Date;
}

interface Distribution {
  id: string;
  fromParticipantId: string;
  toContributionId: string;
  points: number;
  epochId: string;
}

interface Epoch {
  id: string;
  title: string;
  status: 'setup' | 'contribution' | 'distribution' | 'finished';
  distributionEndTime?: Date;
}

interface Props {
  currentParticipant: Participant;
  epochId: string;
  epoch?: Epoch;
}

export default function DistributionView({ currentParticipant, epochId, epoch }: Props) {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [distributions, setDistributions] = useState<Record<string, number>>({});
  const [existingDistributions, setExistingDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const TOTAL_POINTS = 100;

  useEffect(() => {
    fetchData();
  }, [currentParticipant, epochId]);

  const fetchData = async () => {
    try {
      const [contributionsRes, participantsRes, distributionsRes] = await Promise.all([
        fetch(`/api/contributions?epochId=${epochId}`),
        fetch(`/api/epochs/${epochId}/participants`),
        fetch(`/api/distributions?epochId=${epochId}&participantId=${currentParticipant.id}`)
      ]);

      const contributionsData = await contributionsRes.json();
      const participantsData = await participantsRes.json();
      const distributionsData = await distributionsRes.json();

      // Group contributions by the person they're ABOUT (not who wrote them)
      const contributionsByPerson = new Map<string, Contribution[]>();
      contributionsData.forEach((contrib: Contribution) => {
        if (contrib.participantId !== currentParticipant.id) { // Don't show contributions about yourself
          if (!contributionsByPerson.has(contrib.participantId)) {
            contributionsByPerson.set(contrib.participantId, []);
          }
          contributionsByPerson.get(contrib.participantId)!.push(contrib);
        }
      });

      // Convert to flat list for point distribution
      const eligibleContributions: Contribution[] = [];
      contributionsByPerson.forEach((contribs) => {
        eligibleContributions.push(...contribs);
      });

      setContributions(eligibleContributions);
      setParticipants(participantsData);
      setExistingDistributions(distributionsData);

      const existingDist: Record<string, number> = {};
      distributionsData.forEach((dist: Distribution) => {
        existingDist[dist.toContributionId] = dist.points;
      });
      setDistributions(existingDist);

    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
    setLoading(false);
  };

  const getParticipantName = (participantId: string) => {
    const participant = participants.find(p => p.id === participantId);
    return participant?.name || 'Unknown';
  };

  const getTotalDistributed = () => {
    return Object.values(distributions).reduce((sum, points) => sum + points, 0);
  };

  const getRemainingPoints = () => {
    return TOTAL_POINTS - getTotalDistributed();
  };

  const updateDistribution = (contributionId: string, points: number) => {
    if (points < 0) points = 0;
    
    const newDistributions = { ...distributions };
    
    if (points === 0) {
      delete newDistributions[contributionId];
    } else {
      newDistributions[contributionId] = points;
    }

    const totalAfterUpdate = Object.values(newDistributions).reduce((sum, p) => sum + p, 0);
    
    if (totalAfterUpdate <= TOTAL_POINTS) {
      setDistributions(newDistributions);
    }
  };

  const saveDistributions = async () => {
    setSaving(true);
    
    const distributionsArray = Object.entries(distributions).map(([contributionId, points]) => ({
      contributionId,
      points
    }));

    try {
      await fetch('/api/distributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: currentParticipant.id,
          distributions: distributionsArray,
          epochId
        })
      });
      
      alert('Points distributed successfully!');
      fetchData();
    } catch (error) {
      console.error('Failed to save distributions:', error);
      alert('Failed to save distributions. Please try again.');
    }
    
    setSaving(false);
  };

  const resetDistributions = () => {
    setDistributions({});
  };

  // Group contributions by person for display
  const contributionsByPerson = new Map<string, Contribution[]>();
  contributions.forEach(contrib => {
    if (!contributionsByPerson.has(contrib.participantId)) {
      contributionsByPerson.set(contrib.participantId, []);
    }
    contributionsByPerson.get(contrib.participantId)!.push(contrib);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (contributions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No contributions to distribute points to yet. Participants need to add contribution descriptions first.</p>
      </div>
    );
  }

  const remainingPoints = getRemainingPoints();
  const totalDistributed = getTotalDistributed();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Gift className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Distribute Your Points</h2>
          </div>
          <div className="flex items-center space-x-4">
            {epoch && (
              <CountdownTimer 
                endTime={getPhaseEndTime(epoch)} 
                phase="distribution"
                onExpired={() => fetchData()}
              />
            )}
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{remainingPoints}</div>
              <div className="text-sm text-gray-600">points remaining</div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{totalDistributed} / {TOTAL_POINTS}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(totalDistributed / TOTAL_POINTS) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="flex space-x-4 mb-6">
          <button
            onClick={saveDistributions}
            disabled={saving || totalDistributed === 0}
            className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Distribution'}
          </button>
          
          <button
            onClick={resetDistributions}
            disabled={totalDistributed === 0}
            className="flex items-center px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </button>
        </div>

        {remainingPoints < 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">
              <strong>Warning:</strong> You have distributed {Math.abs(remainingPoints)} points over your limit of {TOTAL_POINTS}.
              Please reduce some allocations.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {Array.from(contributionsByPerson.entries()).map(([personId, personContributions]) => (
          <div key={personId} className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-medium text-gray-900 mb-4">
              {getParticipantName(personId)}
            </h3>
            
            <div className="space-y-4">
              {personContributions.map(contribution => {
                const currentPoints = distributions[contribution.id] || 0;
                
                return (
                  <div key={contribution.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">
                          Described by {getParticipantName(contribution.authorId)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(contribution.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-gray-700">{contribution.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateDistribution(contribution.id, currentPoints - 5)}
                          className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center"
                          disabled={currentPoints <= 0}
                        >
                          -
                        </button>
                        
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={currentPoints}
                          onChange={(e) => updateDistribution(contribution.id, parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        
                        <button
                          onClick={() => updateDistribution(contribution.id, currentPoints + 5)}
                          className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center"
                          disabled={remainingPoints < 5}
                        >
                          +
                        </button>
                      </div>
                      
                      <span className="text-sm text-gray-600">points</span>
                      
                      <div className="flex space-x-2 ml-auto">
                        {[5, 10, 15, 25].map(amount => (
                          <button
                            key={amount}
                            onClick={() => updateDistribution(contribution.id, amount)}
                            disabled={remainingPoints + currentPoints < amount}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50"
                          >
                            {amount}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Show total points for this person */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">
                  Total points for {getParticipantName(personId)}:
                </span>
                <span className="text-xl font-bold text-blue-600">
                  {personContributions.reduce((sum, contrib) => sum + (distributions[contrib.id] || 0), 0)} points
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}