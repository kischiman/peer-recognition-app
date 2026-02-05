import { NextApiRequest, NextApiResponse } from 'next';
import { updateContribution, deleteContribution } from '../../../lib/database';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Contribution ID is required' });
  }

  if (req.method === 'PUT') {
    const { description } = req.body;
    
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    try {
      const success = updateContribution(id, description);
      
      if (success) {
        res.status(200).json({ message: 'Contribution updated successfully' });
      } else {
        res.status(404).json({ error: 'Contribution not found' });
      }
    } catch (error) {
      console.error('Update contribution error:', error);
      res.status(500).json({ error: 'Failed to update contribution' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const success = deleteContribution(id);
      
      if (success) {
        res.status(200).json({ message: 'Contribution deleted successfully' });
      } else {
        res.status(404).json({ error: 'Contribution not found' });
      }
    } catch (error) {
      console.error('Delete contribution error:', error);
      res.status(500).json({ error: 'Failed to delete contribution' });
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}