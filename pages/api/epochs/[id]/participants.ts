import { NextApiRequest, NextApiResponse } from 'next';
import { getParticipants } from '../../../../lib/database';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const participants = getParticipants(id as string);
      res.status(200).json(participants);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get participants' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}