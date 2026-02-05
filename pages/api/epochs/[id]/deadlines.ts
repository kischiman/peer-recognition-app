import { NextApiRequest, NextApiResponse } from 'next';
import { getChapterAsync, readDatabaseAsync, writeDatabaseAsync } from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { id } = req.query;
  const { contributionDeadline, distributionDeadline } = req.body;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Chapter ID is required' });
  }

  if (!contributionDeadline && !distributionDeadline) {
    return res.status(400).json({ error: 'At least one deadline must be provided' });
  }

  try {
    // Get current chapter
    const chapter = await getChapterAsync(id);
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    // Update deadlines in database
    const db = await readDatabaseAsync();
    const chapterIndex = db.epochs.findIndex(c => c.id === id);
    
    if (chapterIndex !== -1) {
      const updatedChapter = { ...db.epochs[chapterIndex] };
      
      // Update contribution deadline
      if (contributionDeadline) {
        updatedChapter.contributionDeadline = new Date(contributionDeadline);
        
        // If chapter is in contribution phase, update the end time
        if (updatedChapter.status === 'contribution') {
          updatedChapter.contributionEndTime = new Date(contributionDeadline);
        }
      }
      
      // Update distribution deadline  
      if (distributionDeadline) {
        updatedChapter.distributionDeadline = new Date(distributionDeadline);
        
        // If chapter is in distribution phase, update the end time
        if (updatedChapter.status === 'distribution') {
          updatedChapter.distributionEndTime = new Date(distributionDeadline);
        }
      }
      
      // Recalculate duration if both deadlines exist
      if (updatedChapter.contributionDeadline && updatedChapter.distributionDeadline) {
        const totalDuration = Math.ceil((updatedChapter.distributionDeadline.getTime() - Date.now()) / (1000 * 60 * 60));
        updatedChapter.duration = `${totalDuration}h`;
      }
      
      db.epochs[chapterIndex] = updatedChapter;
      await writeDatabaseAsync(db);
      
      res.status(200).json(updatedChapter);
    } else {
      res.status(404).json({ error: 'Chapter not found in database' });
    }
  } catch (error) {
    console.error('Failed to update chapter deadlines:', error);
    res.status(500).json({ error: 'Failed to update deadlines' });
  }
}