import { NextApiRequest, NextApiResponse } from 'next';
import { updateEpochStatus, getEpoch } from '../../../../lib/database';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    const { status } = req.body;
    
    if (!status || !['setup', 'contribution', 'distribution', 'finished'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    try {
      updateEpochStatus(id as string, status);
      const epoch = getEpoch(id as string);
      res.status(200).json(epoch);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update epoch status' });
    }
  } else {
    res.setHeader('Allow', ['PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}