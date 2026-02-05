import { NextApiRequest, NextApiResponse } from 'next';
import { getAllEpochsAsync } from '../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const epochs = await getAllEpochsAsync();
      res.status(200).json(epochs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get epochs' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}