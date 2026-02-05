import { NextApiRequest, NextApiResponse } from 'next';
import { readDatabase, writeDatabase, Epoch } from '../../../lib/database';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const db = readDatabase();
    const now = new Date();
    let updated = false;

    for (const epoch of db.epochs) {
      if (epoch.status === 'contribution') {
        // Check deadline or fallback to contributionEndTime
        const endTime = epoch.contributionDeadline ? 
          new Date(epoch.contributionDeadline) : 
          (epoch.contributionEndTime ? new Date(epoch.contributionEndTime) : null);
          
        if (endTime && now >= endTime) {
          // Transition from contribution to distribution
          epoch.status = 'distribution';
          // Set distribution end time based on deadline or duration
          if (epoch.distributionDeadline) {
            epoch.distributionEndTime = new Date(epoch.distributionDeadline);
          } else {
            epoch.distributionEndTime = new Date(now.getTime() + (epoch.distributionDuration || 0.5) * 60 * 60 * 1000);
          }
          updated = true;
        }
      } else if (epoch.status === 'distribution') {
        // Check deadline or fallback to distributionEndTime
        const endTime = epoch.distributionDeadline ? 
          new Date(epoch.distributionDeadline) : 
          (epoch.distributionEndTime ? new Date(epoch.distributionEndTime) : null);
          
        if (endTime && now >= endTime) {
          // Transition from distribution to finished
          epoch.status = 'finished';
          epoch.endTime = now;
          updated = true;
        }
      }
    }

    if (updated) {
      writeDatabase(db);
    }

    res.status(200).json({ 
      message: 'Auto-transition check completed', 
      updated 
    });
  } catch (error) {
    console.error('Auto-transition error:', error);
    res.status(500).json({ error: 'Failed to perform auto-transition' });
  }
}