import { NextApiRequest, NextApiResponse } from 'next';
import { createCommentAsync, getCommentsAsync } from '../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { contributionId, participantId, epochId, text } = req.body;
    
    if (!contributionId || !participantId || !epochId || !text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const comment = await createCommentAsync(contributionId, participantId, epochId, text);
      res.status(201).json(comment);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create comment' });
    }
  } else if (req.method === 'GET') {
    const { contributionId } = req.query;
    
    if (!contributionId) {
      return res.status(400).json({ error: 'Missing contributionId parameter' });
    }

    try {
      const comments = await getCommentsAsync(contributionId as string);
      res.status(200).json(comments);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get comments' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}