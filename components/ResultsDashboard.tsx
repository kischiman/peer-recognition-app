import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, MessageSquare } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  epochId: string;
}

interface Contribution {
  id: string;
  participantId: string;
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

interface Comment {
  id: string;
  contributionId: string;
  participantId: string;
  epochId: string;
  text: string;
  createdAt: Date;
}

interface Props {
  epochId: string;
}

interface ParticipantResult {
  participantId: string;
  name: string;
  totalPoints: number;
  contributions: Array<{
    contribution: Contribution;
    points: number;
    comments: Comment[];
  }>;
}

export default function ResultsDashboard({ epochId }: Props) {
  const [results, setResults] = useState<ParticipantResult[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [aiSummaries, setAiSummaries] = useState<Record<string, string>>({});
  const [loadingSummary, setLoadingSummary] = useState<Record<string, boolean>>({});

  const fetchResults = useCallback(async () => {
    try {
      const [participantsRes, contributionsRes, distributionsRes] = await Promise.all([
        fetch(`/api/epochs/${epochId}/participants`),
        fetch(`/api/contributions?epochId=${epochId}`),
        fetch(`/api/distributions?epochId=${epochId}`)
      ]);

      const participantsData: Participant[] = await participantsRes.json();
      const contributionsData: Contribution[] = await contributionsRes.json();
      const distributionsData: Distribution[] = await distributionsRes.json();

      setParticipants(participantsData);

      const participantResults: ParticipantResult[] = [];

      for (const participant of participantsData) {
        const participantContributions = contributionsData.filter(
          c => c.participantId === participant.id
        );

        const contributionResults = [];

        for (const contribution of participantContributions) {
          const contributionDistributions = distributionsData.filter(
            d => d.toContributionId === contribution.id
          );

          const points = contributionDistributions.reduce((sum, d) => sum + d.points, 0);

          const commentsRes = await fetch(`/api/comments?contributionId=${contribution.id}`);
          const comments = await commentsRes.json();

          contributionResults.push({
            contribution,
            points,
            comments
          });
        }

        const totalPoints = contributionResults.reduce((sum, cr) => sum + cr.points, 0);

        participantResults.push({
          participantId: participant.id,
          name: participant.name,
          totalPoints,
          contributions: contributionResults
        });
      }

      participantResults.sort((a, b) => b.totalPoints - a.totalPoints);
      setResults(participantResults);

    } catch (error) {
      console.error('Failed to fetch results:', error);
    }
    setLoading(false);
  }, [epochId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const getParticipantName = (participantId: string) => {
    const participant = participants.find(p => p.id === participantId);
    return participant?.name || 'Unknown';
  };

  const generateAISummary = async (participantId: string) => {
    if (aiSummaries[participantId] || loadingSummary[participantId]) return;
    
    const participant = results.find(r => r.participantId === participantId);
    if (!participant || participant.contributions.length === 0) return;

    setLoadingSummary(prev => ({ ...prev, [participantId]: true }));

    try {
      const response = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personName: participant.name,
          contributions: participant.contributions.map(c => ({
            description: c.contribution.description
          }))
        })
      });

      if (response.ok) {
        const { summary } = await response.json();
        setAiSummaries(prev => ({ ...prev, [participantId]: summary }));
      }
    } catch (error) {
      console.error('Failed to generate AI summary:', error);
    }

    setLoadingSummary(prev => ({ ...prev, [participantId]: false }));
  };


  const chartData = results.map(result => ({
    name: result.name,
    points: result.totalPoints
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <h2 className="text-2xl font-semibold">Results Dashboard</h2>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-medium mb-4">Points Distribution</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="points" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((result, index) => (
            <div 
              key={result.participantId}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedParticipant === result.participantId
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => {
                const newSelected = selectedParticipant === result.participantId ? null : result.participantId;
                setSelectedParticipant(newSelected);
                if (newSelected) {
                  generateAISummary(newSelected);
                }
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {index < 3 && (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                    }`}>
                      {index + 1}
                    </div>
                  )}
                  <span className="font-medium">{result.name}</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {result.totalPoints}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {result.contributions.length} contribution(s)
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedParticipant && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">
            {results.find(r => r.participantId === selectedParticipant)?.name} - Detailed Results
          </h3>

          {/* Skills Summary */}
          <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-100">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-indigo-900 mb-2">🎯 Observed Skills</h4>
                {loadingSummary[selectedParticipant] ? (
                  <div className="flex items-center space-x-2 text-indigo-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                    <span className="text-sm">Analyzing contributions...</span>
                  </div>
                ) : aiSummaries[selectedParticipant] ? (
                  <div className="flex flex-wrap gap-2">
                    {aiSummaries[selectedParticipant].split(', ').map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-white border border-indigo-200 text-indigo-800 text-sm rounded-full font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-indigo-600 text-sm">
                    Click to analyze their skills...
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {results
              .find(r => r.participantId === selectedParticipant)
              ?.contributions.map(({ contribution, points, comments }) => (
                <div key={contribution.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-4 mb-3">
                        <p className="text-gray-700">{contribution.description}</p>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-green-600">{points}</div>
                      <div className="text-sm text-gray-600">points</div>
                    </div>
                  </div>

                  {comments.length > 0 && (
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <MessageSquare className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                          Comments ({comments.length})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {comments.map(comment => (
                          <div key={comment.id} className="bg-blue-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {getParticipantName(comment.participantId)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(comment.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-gray-700 text-sm">{comment.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium mb-4">Summary Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {results.reduce((sum, r) => sum + r.totalPoints, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Points Distributed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {results.length}
            </div>
            <div className="text-sm text-gray-600">Participants</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {results.reduce((sum, r) => sum + r.contributions.length, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Contributions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(results.reduce((sum, r) => sum + r.totalPoints, 0) / results.length)}
            </div>
            <div className="text-sm text-gray-600">Average Points</div>
          </div>
        </div>
      </div>
    </div>
  );
}