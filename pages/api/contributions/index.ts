import { NextApiRequest, NextApiResponse } from 'next';
import { createContributionAsync, getContributionsAsync } from '../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { participantId, authorId, epochId, description } = req.body;
    
    if (!participantId || !authorId || !epochId || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const contribution = await createContributionAsync(participantId, authorId, epochId, description);
      res.status(201).json(contribution);
    } catch (error) {
      console.error('Failed to create contribution:', error);
      res.status(500).json({ error: 'Failed to create contribution' });
    }
  } else if (req.method === 'GET') {
    const { epochId } = req.query;
    
    if (!epochId) {
      return res.status(400).json({ error: 'Missing epochId parameter' });
    }

    try {
      const contributions = await getContributionsAsync(epochId as string);
      res.status(200).json(contributions);
    } catch (error) {
      console.error('Failed to get contributions:', error);
      res.status(500).json({ error: 'Failed to get contributions' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}