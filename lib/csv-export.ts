// CSV Export utilities for chapter data

export interface ChapterExportData {
  chapterId: string;
  chapterTitle: string;
  status: string;
  createdAt: Date;
  participants: any[];
  contributions: any[];
  distributions: any[];
  comments: any[];
}

export function generateChapterCSV(data: ChapterExportData): string {
  const csvRows: string[] = [];
  
  // Add header information
  csvRows.push('# Chapter Export Data');
  csvRows.push(`# Chapter: ${data.chapterTitle}`);
  csvRows.push(`# Status: ${data.status}`);
  csvRows.push(`# Created: ${data.createdAt.toISOString()}`);
  csvRows.push(`# Export Date: ${new Date().toISOString()}`);
  csvRows.push('');
  
  // Participants section
  csvRows.push('## PARTICIPANTS');
  csvRows.push('Participant ID,Name');
  data.participants.forEach(p => {
    csvRows.push(`"${p.id}","${p.name}"`);
  });
  csvRows.push('');
  
  // Contributions section
  csvRows.push('## CONTRIBUTIONS');
  csvRows.push('Contribution ID,About Participant,Author Participant,Description,Created At');
  data.contributions.forEach(c => {
    const aboutParticipant = data.participants.find(p => p.id === c.participantId)?.name || 'Unknown';
    const authorParticipant = data.participants.find(p => p.id === c.authorId)?.name || 'Unknown';
    const description = c.description.replace(/"/g, '""'); // Escape quotes
    csvRows.push(`"${c.id}","${aboutParticipant}","${authorParticipant}","${description}","${c.createdAt}"`);
  });
  csvRows.push('');
  
  // Point distributions section
  csvRows.push('## POINT DISTRIBUTIONS');
  csvRows.push('Distribution ID,From Participant,To Contribution,Points,Created At');
  data.distributions.forEach(d => {
    const fromParticipant = data.participants.find(p => p.id === d.fromParticipantId)?.name || 'Unknown';
    const toContribution = data.contributions.find(c => c.id === d.toContributionId);
    const toParticipant = toContribution ? data.participants.find(p => p.id === toContribution.participantId)?.name : 'Unknown';
    csvRows.push(`"${d.id}","${fromParticipant}","${toParticipant} (${d.toContributionId})","${d.points}","${d.createdAt}"`);
  });
  csvRows.push('');
  
  // Comments section
  if (data.comments.length > 0) {
    csvRows.push('## COMMENTS');
    csvRows.push('Comment ID,Contribution ID,Participant,Text,Created At');
    data.comments.forEach(c => {
      const participant = data.participants.find(p => p.id === c.participantId)?.name || 'Unknown';
      const text = c.text.replace(/"/g, '""'); // Escape quotes
      csvRows.push(`"${c.id}","${c.contributionId}","${participant}","${text}","${c.createdAt}"`);
    });
    csvRows.push('');
  }
  
  // Summary section
  csvRows.push('## SUMMARY');
  csvRows.push('Metric,Value');
  csvRows.push(`"Total Participants","${data.participants.length}"`);
  csvRows.push(`"Total Contributions","${data.contributions.length}"`);
  csvRows.push(`"Total Points Distributed","${data.distributions.reduce((sum, d) => sum + d.points, 0)}"`);
  csvRows.push(`"Total Comments","${data.comments.length}"`);
  
  // Points summary by participant
  csvRows.push('');
  csvRows.push('## POINTS SUMMARY');
  csvRows.push('Participant,Points Received,Points Given');
  
  const pointsSummary = new Map<string, { received: number; given: number }>();
  
  // Initialize all participants
  data.participants.forEach(p => {
    pointsSummary.set(p.id, { received: 0, given: 0 });
  });
  
  // Calculate points received
  data.distributions.forEach(d => {
    const contribution = data.contributions.find(c => c.id === d.toContributionId);
    if (contribution) {
      const current = pointsSummary.get(contribution.participantId) || { received: 0, given: 0 };
      current.received += d.points;
      pointsSummary.set(contribution.participantId, current);
    }
  });
  
  // Calculate points given
  data.distributions.forEach(d => {
    const current = pointsSummary.get(d.fromParticipantId) || { received: 0, given: 0 };
    current.given += d.points;
    pointsSummary.set(d.fromParticipantId, current);
  });
  
  // Output points summary
  data.participants.forEach(p => {
    const summary = pointsSummary.get(p.id) || { received: 0, given: 0 };
    csvRows.push(`"${p.name}","${summary.received}","${summary.given}"`);
  });
  
  return csvRows.join('\n');
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}