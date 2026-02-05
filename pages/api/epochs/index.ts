import { NextApiRequest, NextApiResponse } from 'next';
import { createEpoch, getActiveEpoch, getLatestEpoch } from '../../../lib/database';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { title, participants, contributionDeadline, distributionDeadline, contributionDuration, distributionDuration } = req.body;
    
    if (!title || !participants || !Array.isArray(participants)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const chapter = createEpoch(title, participants, contributionDeadline, distributionDeadline, contributionDuration, distributionDuration);
      res.status(201).json(chapter);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create chapter' });
    }
  } else if (req.method === 'GET') {
    const { latest } = req.query;
    
    try {
      const epoch = latest === 'true' ? getLatestEpoch() : getActiveEpoch();
      res.status(200).json(epoch);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get epoch' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}