import { NextApiRequest, NextApiResponse } from 'next';
import { removeParticipantFromChapter } from '../../../../lib/database';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Participant ID is required' });
  }

  try {
    const success = removeParticipantFromChapter(id);
    
    if (success) {
      res.status(200).json({ message: 'Participant removed successfully' });
    } else {
      res.status(404).json({ error: 'Participant not found' });
    }
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({ error: 'Failed to remove participant' });
  }
}