import { NextApiRequest, NextApiResponse } from 'next';
import { deleteChapter } from '../../../../lib/database';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Chapter ID is required' });
  }

  try {
    const success = deleteChapter(id);
    
    if (success) {
      res.status(200).json({ message: 'Chapter deleted successfully' });
    } else {
      res.status(404).json({ error: 'Chapter not found' });
    }
  } catch (error) {
    console.error('Delete chapter error:', error);
    res.status(500).json({ error: 'Failed to delete chapter' });
  }
}