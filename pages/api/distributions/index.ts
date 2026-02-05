import { NextApiRequest, NextApiResponse } from 'next';
import { distributePoints, getDistributions, getParticipantDistributions } from '../../../lib/database';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { participantId, distributions, epochId } = req.body;
    
    if (!participantId || !distributions || !epochId || !Array.isArray(distributions)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const totalPoints = distributions.reduce((sum, dist) => sum + dist.points, 0);
    if (totalPoints > 100) {
      return res.status(400).json({ error: 'Total points cannot exceed 100' });
    }

    try {
      distributePoints(participantId, distributions, epochId);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to distribute points' });
    }
  } else if (req.method === 'GET') {
    const { epochId, participantId } = req.query;
    
    if (!epochId) {
      return res.status(400).json({ error: 'Missing epochId parameter' });
    }

    try {
      const distributions = participantId 
        ? getParticipantDistributions(participantId as string, epochId as string)
        : getDistributions(epochId as string);
      res.status(200).json(distributions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get distributions' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}