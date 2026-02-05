import { NextApiRequest, NextApiResponse } from 'next';
import { createEpochAsync, getActiveEpochAsync, getLatestEpochAsync } from '../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { title, participants, contributionDeadline, distributionDeadline, contributionDuration, distributionDuration } = req.body;
    
    if (!title || !participants || !Array.isArray(participants)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const chapter = await createEpochAsync(title, participants, contributionDeadline, distributionDeadline, contributionDuration, distributionDuration);
      res.status(201).json(chapter);
    } catch (error) {
      console.error('Error creating chapter:', error);
      res.status(500).json({ error: 'Failed to create chapter', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  } else if (req.method === 'GET') {
    const { latest } = req.query;
    
    try {
      const epoch = latest === 'true' ? await getLatestEpochAsync() : await getActiveEpochAsync();
      res.status(200).json(epoch);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get epoch' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}