import React, { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Edit3, Save, X } from 'lucide-react';
import CountdownTimer from './CountdownTimer';
import { getPhaseEndTime } from '../lib/timer-utils';

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

interface Contribution {
  id: string;
  participantId: string; // who the contribution is ABOUT
  authorId: string; // who WROTE the description
  epochId: string;
  description: string;
  createdAt: Date;
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
  currentParticipant: Participant;
  onLogout: () => void;
}

export default function CircleView({ currentParticipant, onLogout }: Props) {
  const [epoch, setEpoch] = useState<Epoch | null>(null);
  const [otherParticipants, setOtherParticipants] = useState<Participant[]>([]);
  const [allContributions, setAllContributions] = useState<Contribution[]>([]);
  const [myContributions, setMyContributions] = useState<Record<string, Contribution[]>>({});
  const [editingContribution, setEditingContribution] = useState<string | null>(null);
  const [tempDescription, setTempDescription] = useState('');
  const [addingForParticipant, setAddingForParticipant] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [epochRes, participantsRes, contributionsRes] = await Promise.all([
        fetch('/api/epochs'),
        fetch(`/api/epochs/${currentParticipant.chapterId}/participants`),
        fetch(`/api/contributions?epochId=${currentParticipant.chapterId}`)
      ]);

      const epochData = await epochRes.json();
      const participantsData = await participantsRes.json();
      const contributionsData = await contributionsRes.json();

      setEpoch(epochData);
      
      // Get other participants (excluding current user)
      const others = participantsData.filter((p: Participant) => p.id !== currentParticipant.id);
      setOtherParticipants(others);
      setAllContributions(contributionsData);

      // Build map of my contributions about each person
      const myContribMap: Record<string, Contribution[]> = {};
      contributionsData.forEach((contrib: Contribution) => {
        if (contrib.authorId === currentParticipant.id) {
          if (!myContribMap[contrib.participantId]) {
            myContribMap[contrib.participantId] = [];
          }
          myContribMap[contrib.participantId].push(contrib);
        }
      });
      setMyContributions(myContribMap);

      // Fetch comments for all contributions
      const commentsData: Record<string, Comment[]> = {};
      for (const contribution of contributionsData) {
        const commentsRes = await fetch(`/api/comments?contributionId=${contribution.id}`);
        commentsData[contribution.id] = await commentsRes.json();
      }
      setComments(commentsData);

    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
    setLoading(false);
  }, [currentParticipant.chapterId, currentParticipant.id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const startEditing = (contributionId: string, currentDescription: string) => {
    setEditingContribution(contributionId);
    setTempDescription(currentDescription);
  };

  const startAdding = (participantId: string) => {
    setAddingForParticipant(participantId);
    setTempDescription('');
  };

  const saveContribution = async () => {
    if (!tempDescription.trim()) return;

    try {
      if (editingContribution) {
        // Update existing contribution
        await fetch(`/api/contributions/${editingContribution}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: tempDescription
          })
        });
        setEditingContribution(null);
      } else if (addingForParticipant) {
        // Create new contribution
        await fetch('/api/contributions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId: addingForParticipant,
            authorId: currentParticipant.id,
            epochId: currentParticipant.chapterId,
            description: tempDescription
          })
        });
        setAddingForParticipant(null);
      }
      
      setTempDescription('');
      fetchData();
    } catch (error) {
      console.error('Failed to save contribution:', error);
    }
  };

  const deleteContribution = async (contributionId: string) => {
    if (!window.confirm('Are you sure you want to delete this contribution?')) {
      return;
    }

    try {
      await fetch(`/api/contributions/${contributionId}`, {
        method: 'DELETE'
      });
      fetchData();
    } catch (error) {
      console.error('Failed to delete contribution:', error);
    }
  };

  const cancelEditing = () => {
    setEditingContribution(null);
    setAddingForParticipant(null);
    setTempDescription('');
  };

  const addComment = async (contributionId: string) => {
    const commentText = newComment[contributionId];
    if (!commentText?.trim()) return;

    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contributionId,
          participantId: currentParticipant.id,
          epochId: currentParticipant.chapterId,
          text: commentText
        })
      });
      
      setNewComment({ ...newComment, [contributionId]: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const getParticipantName = (participantId: string) => {
    const allParticipants = [...otherParticipants, currentParticipant];
    const participant = allParticipants.find(p => p.id === participantId);
    return participant?.name || 'Unknown';
  };

  const getContributionsForParticipant = (participantId: string) => {
    return allContributions.filter(c => c.participantId === participantId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!epoch) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Active Epoch</h2>
          <button onClick={onLogout} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{epoch.title}</h1>
            <p className="text-sm text-gray-600">
              Welcome, {currentParticipant.name} • Status: {epoch.status}
            </p>
          </div>
          
          {(epoch.status === 'contribution' || epoch.status === 'distribution') && (
            <div className="flex-shrink-0 mr-4">
              <CountdownTimer 
                endTime={getPhaseEndTime(epoch)} 
                phase={epoch.status}
                onExpired={() => fetchData()}
              />
            </div>
          )}
          <button
            onClick={onLogout}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {epoch.status === 'contribution' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Describe Team Contributions and Skills</h2>
            <p className="text-gray-600 mb-6">
              For each team member, describe how they contributed or helped you, and what you noticed they were particularly good at.
            </p>

            {otherParticipants.map(participant => {
              const participantContributions = myContributions[participant.id] || [];
              
              return (
                <div key={participant.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-medium text-gray-900">{participant.name}</h3>
                    <button
                      onClick={() => startAdding(participant.id)}
                      className="flex items-center px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      disabled={addingForParticipant === participant.id}
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Add Contribution
                    </button>
                  </div>

                  {/* Existing contributions */}
                  {participantContributions.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {participantContributions.map((contribution, index) => (
                        <div key={contribution.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              Contribution #{index + 1}
                            </span>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => startEditing(contribution.id, contribution.description)}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                                disabled={editingContribution === contribution.id}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteContribution(contribution.id)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          
                          {editingContribution === contribution.id ? (
                            <div className="space-y-3">
                              <textarea
                                value={tempDescription}
                                onChange={(e) => setTempDescription(e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={`Describe what ${participant.name} contributed...`}
                              />
                              <div className="flex space-x-2">
                                <button
                                  onClick={saveContribution}
                                  className="flex items-center px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                                >
                                  <Save className="w-3 h-3 mr-1" />
                                  Save
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="flex items-center px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-gray-700 whitespace-pre-wrap">
                              {contribution.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new contribution form */}
                  {addingForParticipant === participant.id && (
                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50">
                      <div className="space-y-3">
                        <textarea
                          value={tempDescription}
                          onChange={(e) => setTempDescription(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Describe what ${participant.name} contributed...`}
                          autoFocus
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={saveContribution}
                            className="flex items-center px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                          >
                            <Save className="w-3 h-3 mr-1" />
                            Add Contribution
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="flex items-center px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {participantContributions.length === 0 && addingForParticipant !== participant.id && (
                    <div className="p-4 bg-gray-50 rounded-lg text-gray-600 text-center">
                      No contributions added yet for {participant.name}.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {(epoch.status === 'distribution' || epoch.status === 'finished') && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">All Team Contributions</h2>

            {otherParticipants.map(participant => {
              const contributions = getContributionsForParticipant(participant.id);
              
              return (
                <div key={participant.id} className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-medium text-gray-900 mb-4">{participant.name}</h3>
                  
                  {contributions.length === 0 ? (
                    <div className="p-4 bg-gray-50 rounded-lg text-gray-600">
                      No contributions described yet for {participant.name}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {contributions.map(contribution => (
                        <div key={contribution.id} className="border-l-4 border-blue-500 pl-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600">
                              Described by {getParticipantName(contribution.authorId)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(contribution.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <p className="text-gray-700">{contribution.description}</p>
                          </div>

                          {/* Comments section */}
                          <div className="space-y-3">
                            {comments[contribution.id]?.map(comment => (
                              <div key={comment.id} className="bg-blue-50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-gray-900">
                                    {getParticipantName(comment.participantId)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(comment.createdAt).toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="text-gray-700 text-sm">{comment.text}</p>
                              </div>
                            ))}

                            {epoch.status === 'distribution' && (
                              <div className="flex space-x-3 mt-3">
                                <input
                                  type="text"
                                  value={newComment[contribution.id] || ''}
                                  onChange={(e) => setNewComment({ 
                                    ...newComment, 
                                    [contribution.id]: e.target.value 
                                  })}
                                  placeholder="Add additional feedback..."
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      addComment(contribution.id);
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => addComment(contribution.id)}
                                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                  <MessageCircle className="w-4 h-4 mr-2" />
                                  Comment
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {epoch.status === 'setup' && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Session Not Started</h2>
            <p className="text-gray-600">Please wait for the administrator to start the contribution phase.</p>
          </div>
        )}
      </div>
    </div>
  );
}