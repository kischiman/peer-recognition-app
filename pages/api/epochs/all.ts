import { NextApiRequest, NextApiResponse } from 'next';
import { getAllEpochs } from '../../../lib/database';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const epochs = getAllEpochs();
      res.status(200).json(epochs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get epochs' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}