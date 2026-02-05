import React, { useState, useEffect } from 'react';
import { Plus, Play, Square, BarChart3, Trash2, Edit, Users, UserPlus, UserMinus, Download, Calendar, Save, X } from 'lucide-react';
import { generateChapterCSV, downloadCSV, ChapterExportData } from '../lib/csv-export';

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

export default function AdminPanel() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [contributionDeadline, setContributionDeadline] = useState('');
  const [distributionDeadline, setDistributionDeadline] = useState('');
  const [participantsText, setParticipantsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [managingParticipants, setManagingParticipants] = useState<string | null>(null);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [chapterParticipants, setChapterParticipants] = useState<any[]>([]);
  const [loadingParticipant, setLoadingParticipant] = useState(false);
  const [editingDeadlines, setEditingDeadlines] = useState<string | null>(null);
  const [editContributionDeadline, setEditContributionDeadline] = useState('');
  const [editDistributionDeadline, setEditDistributionDeadline] = useState('');
  const [savingDeadlines, setSavingDeadlines] = useState(false);

  useEffect(() => {
    fetchChapters();
    
    // Set default deadlines - contribution deadline 24 hours from now, distribution deadline 25 hours from now
    const now = new Date();
    const contributionDefault = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const distributionDefault = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    
    setContributionDeadline(contributionDefault.toISOString().slice(0, 16));
    setDistributionDeadline(distributionDefault.toISOString().slice(0, 16));
  }, []);

  const formatDuration = (startTime: Date, endTime: Date): string => {
    const diff = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  };

  const getContributionDuration = (): string => {
    if (!contributionDeadline) return '';
    const now = new Date();
    const deadline = new Date(contributionDeadline);
    return formatDuration(now, deadline);
  };

  const getDistributionDuration = (): string => {
    if (!distributionDeadline || !contributionDeadline) return '';
    const contributionEnd = new Date(contributionDeadline);
    const distributionEnd = new Date(distributionDeadline);
    return formatDuration(contributionEnd, distributionEnd);
  };

  const fetchChapters = async () => {
    try {
      const response = await fetch('/api/epochs/all');
      const chaptersData = await response.json();
      setChapters(chaptersData);
    } catch (error) {
      console.error('Failed to fetch chapters:', error);
    }
  };

  const createChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const participants = participantsText
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0);

    try {
      const response = await fetch('/api/epochs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          participants,
          contributionDeadline,
          distributionDeadline
        })
      });

      if (response.ok) {
        setShowCreateForm(false);
        setTitle('');
        setParticipantsText('');
        
        // Reset to default deadlines
        const now = new Date();
        const contributionDefault = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const distributionDefault = new Date(now.getTime() + 25 * 60 * 60 * 1000);
        setContributionDeadline(contributionDefault.toISOString().slice(0, 16));
        setDistributionDeadline(distributionDefault.toISOString().slice(0, 16));
        
        fetchChapters();
      } else {
        const errorData = await response.json();
        console.error('Failed to create chapter:', errorData);
        alert(`Failed to create chapter: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create epoch:', error);
      alert('Failed to create chapter. Please check the console for details.');
    }
    
    setLoading(false);
  };

  const updateChapterStatus = async (chapterId: string, newStatus: string, currentStatus: string, chapterTitle: string) => {
    // Show confirmation for potentially disruptive actions
    let confirmMessage = null;
    
    if (newStatus === 'setup' && currentStatus !== 'setup') {
      confirmMessage = `Reset "${chapterTitle}" to Setup phase? This will clear all timing data.`;
    } else if (newStatus === 'contribution' && (currentStatus === 'distribution' || currentStatus === 'finished')) {
      confirmMessage = `Move "${chapterTitle}" back to Contribution phase? This will restart the contribution timer.`;
    } else if (newStatus === 'distribution' && currentStatus === 'finished') {
      confirmMessage = `Re-open "${chapterTitle}" for Distribution phase? This will restart the distribution timer.`;
    }
    
    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/epochs/${chapterId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchChapters();
      }
    } catch (error) {
      console.error('Failed to update chapter status:', error);
    }
  };

  const deleteChapter = async (chapterId: string, chapterTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${chapterTitle}"? This will permanently remove all participants, contributions, and results.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/epochs/${chapterId}/delete`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchChapters();
      } else {
        alert('Failed to delete chapter. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete chapter:', error);
      alert('Failed to delete chapter. Please try again.');
    }
  };

  const fetchChapterParticipants = async (chapterId: string) => {
    try {
      const response = await fetch(`/api/epochs/${chapterId}/participants`);
      const participants = await response.json();
      setChapterParticipants(participants);
    } catch (error) {
      console.error('Failed to fetch chapter participants:', error);
    }
  };

  const addParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParticipantName.trim() || !managingParticipants) return;

    setLoadingParticipant(true);
    try {
      const response = await fetch(`/api/epochs/${managingParticipants}/participants/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newParticipantName.trim() })
      });

      if (response.ok) {
        setNewParticipantName('');
        fetchChapterParticipants(managingParticipants);
        fetchChapters(); // Refresh chapter data to show updated participant count
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add participant');
      }
    } catch (error) {
      console.error('Failed to add participant:', error);
      alert('Failed to add participant. Please try again.');
    }
    setLoadingParticipant(false);
  };

  const removeParticipant = async (participantId: string, participantName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${participantName}? This will delete all their contributions and distributions.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/participants/${participantId}/remove`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchChapterParticipants(managingParticipants!);
        fetchChapters(); // Refresh chapter data to show updated participant count
      } else {
        alert('Failed to remove participant. Please try again.');
      }
    } catch (error) {
      console.error('Failed to remove participant:', error);
      alert('Failed to remove participant. Please try again.');
    }
  };

  const openParticipantManagement = (chapterId: string) => {
    setManagingParticipants(chapterId);
    fetchChapterParticipants(chapterId);
  };

  const closeParticipantManagement = () => {
    setManagingParticipants(null);
    setChapterParticipants([]);
    setNewParticipantName('');
  };

  const exportChapterData = async (chapterId: string, chapterTitle: string) => {
    try {
      const response = await fetch(`/api/epochs/${chapterId}/export`);
      if (response.ok) {
        const exportData: ChapterExportData = await response.json();
        const csvContent = generateChapterCSV(exportData);
        
        // Generate filename with chapter title and date
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const safeTitle = chapterTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `chapter_${safeTitle}_${date}.csv`;
        
        downloadCSV(csvContent, filename);
      } else {
        const errorData = await response.json();
        alert(`Failed to export chapter data: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to export chapter:', error);
      alert('Failed to export chapter data. Please try again.');
    }
  };

  const startEditingDeadlines = (chapter: Chapter) => {
    setEditingDeadlines(chapter.id);
    
    // Set current deadlines as default values
    const contributionDeadline = chapter.contributionDeadline 
      ? new Date(chapter.contributionDeadline).toISOString().slice(0, 16)
      : '';
    const distributionDeadline = chapter.distributionDeadline 
      ? new Date(chapter.distributionDeadline).toISOString().slice(0, 16)
      : '';
      
    setEditContributionDeadline(contributionDeadline);
    setEditDistributionDeadline(distributionDeadline);
  };

  const cancelEditingDeadlines = () => {
    setEditingDeadlines(null);
    setEditContributionDeadline('');
    setEditDistributionDeadline('');
  };

  const saveDeadlines = async () => {
    if (!editingDeadlines) return;
    
    setSavingDeadlines(true);
    
    try {
      const response = await fetch(`/api/epochs/${editingDeadlines}/deadlines`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contributionDeadline: editContributionDeadline || undefined,
          distributionDeadline: editDistributionDeadline || undefined
        })
      });

      if (response.ok) {
        cancelEditingDeadlines();
        fetchChapters(); // Refresh to show updated deadlines
      } else {
        const errorData = await response.json();
        alert(`Failed to update deadlines: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to update deadlines:', error);
      alert('Failed to update deadlines. Please try again.');
    }
    
    setSavingDeadlines(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'setup': return 'bg-gray-100 text-gray-800';
      case 'contribution': return 'bg-blue-100 text-blue-800';
      case 'distribution': return 'bg-orange-100 text-orange-800';
      case 'finished': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusActions = (chapter: Chapter) => {
    return (
      <div className="flex items-center space-x-2">
        {/* Phase Control Buttons */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => updateChapterStatus(chapter.id, 'setup', chapter.status, chapter.title)}
            className={`flex items-center px-2 py-1 rounded text-xs ${
              chapter.status === 'setup' 
                ? 'bg-gray-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Reset to Setup Phase"
          >
            Setup
          </button>
          <button
            onClick={() => updateChapterStatus(chapter.id, 'contribution', chapter.status, chapter.title)}
            className={`flex items-center px-2 py-1 rounded text-xs ${
              chapter.status === 'contribution' 
                ? 'bg-green-600 text-white' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
            title="Start/Resume Contribution Phase"
          >
            <Play className="w-3 h-3 mr-1" />
            Contribution
          </button>
          <button
            onClick={() => updateChapterStatus(chapter.id, 'distribution', chapter.status, chapter.title)}
            className={`flex items-center px-2 py-1 rounded text-xs ${
              chapter.status === 'distribution' 
                ? 'bg-blue-600 text-white' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
            title="Start/Resume Distribution Phase"
          >
            <Play className="w-3 h-3 mr-1" />
            Distribution
          </button>
          <button
            onClick={() => updateChapterStatus(chapter.id, 'finished', chapter.status, chapter.title)}
            className={`flex items-center px-2 py-1 rounded text-xs ${
              chapter.status === 'finished' 
                ? 'bg-red-600 text-white' 
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
            title="Finish Chapter"
          >
            <Square className="w-3 h-3 mr-1" />
            Finish
          </button>
        </div>
        
        {/* Manage Participants Button */}
        <button
          onClick={() => openParticipantManagement(chapter.id)}
          className="flex items-center px-3 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 text-sm"
        >
          <Users className="w-3 h-3 mr-1" />
          Manage Participants
        </button>

        {/* Edit Deadlines Button */}
        <button
          onClick={() => startEditingDeadlines(chapter)}
          className="flex items-center px-3 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 text-sm"
        >
          <Calendar className="w-3 h-3 mr-1" />
          Edit Deadlines
        </button>

        {/* Export CSV Button */}
        <button
          onClick={() => exportChapterData(chapter.id, chapter.title)}
          className="flex items-center px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
        >
          <Download className="w-3 h-3 mr-1" />
          Export CSV
        </button>

        {/* Results Button */}
        {(chapter.status === 'distribution' || chapter.status === 'finished') && (
          <a
            href={`/results?chapterId=${chapter.id}`}
            className="flex items-center px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
          >
            <BarChart3 className="w-3 h-3 mr-1" />
            Results
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chapter
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6">Create New Chapter</h2>
          <form onSubmit={createChapter} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chapter Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contribution Phase Deadline 
                  {contributionDeadline && (
                    <span className="text-xs text-gray-500 font-normal"> 
                      ({getContributionDuration()} from now)
                    </span>
                  )}
                </label>
                <input
                  type="datetime-local"
                  value={contributionDeadline}
                  onChange={(e) => setContributionDeadline(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  When participants must finish writing contributions
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Distribution Phase Deadline
                  {distributionDeadline && contributionDeadline && (
                    <span className="text-xs text-gray-500 font-normal"> 
                      ({getDistributionDuration()} to distribute)
                    </span>
                  )}
                </label>
                <input
                  type="datetime-local"
                  value={distributionDeadline}
                  onChange={(e) => setDistributionDeadline(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  When participants must finish distributing points
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Participant Names (one per line)
              </label>
              <textarea
                value={participantsText}
                onChange={(e) => setParticipantsText(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Alice&#10;Bob&#10;Charlie&#10;Diana"
                required
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Chapter'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900">All Chapters</h2>
        
        {chapters.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Chapters Yet</h3>
            <p className="text-gray-600 mb-4">Create your first chapter to get started.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Chapter
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {chapters.map((chapter) => (
              <div key={chapter.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{chapter.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(chapter.status)}`}>
                        {chapter.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>Duration: {chapter.duration}</span>
                      <span>{chapter.participants.length} participants</span>
                      <span>Created: {new Date(chapter.createdAt).toLocaleDateString()}</span>
                      {chapter.startTime && (
                        <span>Started: {new Date(chapter.startTime).toLocaleDateString()}</span>
                      )}
                      {chapter.endTime && (
                        <span>Finished: {new Date(chapter.endTime).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    {getStatusActions(chapter)}
                    <button
                      onClick={() => deleteChapter(chapter.id, chapter.title)}
                      className="flex items-center justify-center px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                      title="Delete Chapter"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Participants</h4>
                  <div className="flex flex-wrap gap-2">
                    {chapter.participants.map((name, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Participant Management Modal */}
      {managingParticipants && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Manage Participants</h3>
                <button
                  onClick={closeParticipantManagement}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              {/* Add New Participant */}
              <form onSubmit={addParticipant} className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add New Participant
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newParticipantName}
                    onChange={(e) => setNewParticipantName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter participant name"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loadingParticipant}
                    className="flex items-center px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    {loadingParticipant ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </form>

              {/* Current Participants */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Current Participants ({chapterParticipants.length})
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {chapterParticipants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{participant.name}</span>
                      <button
                        onClick={() => removeParticipant(participant.id, participant.name)}
                        className="flex items-center px-2 py-1 text-red-600 hover:bg-red-100 rounded text-sm"
                        title="Remove participant"
                      >
                        <UserMinus className="w-3 h-3 mr-1" />
                        Remove
                      </button>
                    </div>
                  ))}
                  {chapterParticipants.length === 0 && (
                    <p className="text-gray-500 text-sm">No participants yet.</p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={closeParticipantManagement}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deadline Editing Modal */}
      {editingDeadlines && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Edit Chapter Deadlines</h3>
                <button
                  onClick={cancelEditingDeadlines}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Contribution Deadline */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contribution Phase Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={editContributionDeadline}
                    onChange={(e) => setEditContributionDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    When participants must finish writing contributions
                  </p>
                </div>

                {/* Distribution Deadline */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Distribution Phase Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={editDistributionDeadline}
                    onChange={(e) => setEditDistributionDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    When participants must finish distributing points
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={cancelEditingDeadlines}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={saveDeadlines}
                  disabled={savingDeadlines}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-1" />
                  {savingDeadlines ? 'Saving...' : 'Save Deadlines'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}