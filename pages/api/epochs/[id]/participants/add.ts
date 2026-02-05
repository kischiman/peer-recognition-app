import { NextApiRequest, NextApiResponse } from 'next';
import { addParticipantToChapter } from '../../../../../lib/database';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { id } = req.query;
  const { name } = req.body;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Chapter ID is required' });
  }
  
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Participant name is required' });
  }

  try {
    const participant = addParticipantToChapter(id, name);
    
    if (participant) {
      res.status(201).json(participant);
    } else {
      res.status(400).json({ error: 'Failed to add participant. Participant may already exist or chapter not found.' });
    }
  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({ error: 'Failed to add participant' });
  }
}