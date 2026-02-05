import { NextApiRequest, NextApiResponse } from 'next';
import { 
  getChapterAsync, 
  getParticipantsAsync, 
  getContributionsAsync, 
  getDistributionsAsync, 
  getCommentsAsync 
} from '../../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Chapter ID is required' });
  }

  try {
    // Fetch all chapter data
    const [chapter, participants, contributions, distributions] = await Promise.all([
      getChapterAsync(id),
      getParticipantsAsync(id),
      getContributionsAsync(id),
      getDistributionsAsync(id)
    ]);

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    // Fetch comments for all contributions
    const allComments = [];
    for (const contribution of contributions) {
      const comments = await getCommentsAsync(contribution.id);
      allComments.push(...comments);
    }

    // Return export data
    res.status(200).json({
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      status: chapter.status,
      createdAt: chapter.createdAt,
      participants,
      contributions,
      distributions,
      comments: allComments
    });
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ error: 'Failed to fetch export data' });
  }
}