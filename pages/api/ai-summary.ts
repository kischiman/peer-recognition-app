import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { personName, contributions } = req.body;

  if (!personName || !contributions || !Array.isArray(contributions)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Combine all contribution descriptions
    const allContributions = contributions.map(c => c.description).join(' ');
    
    // Generate AI summary using the new approach
    const summary = generateSkillsList(personName, allContributions);
    
    res.status(200).json({ summary });
  } catch (error) {
    console.error('Failed to generate summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
}

function generateSkillsList(name: string, contributions: string): string {
  const text = contributions.toLowerCase();
  
  // Define skill categories with more specific detection
  const skillDetection = [
    // Conventional skills
    { skills: ['leadership'], keywords: ['lead', 'leading', 'manage', 'managing', 'guide', 'guiding', 'direct', 'organize'] },
    { skills: ['collaboration'], keywords: ['collaborate', 'team', 'work with', 'together', 'coordinate', 'help', 'support'] },
    { skills: ['communication'], keywords: ['communicate', 'present', 'explain', 'discuss', 'talk', 'meeting', 'speaking'] },
    { skills: ['problem-solving'], keywords: ['solve', 'fix', 'debug', 'troubleshoot', 'resolve', 'issue', 'problem'] },
    { skills: ['research'], keywords: ['research', 'investigate', 'analyze', 'study', 'explore', 'user research'] },
    { skills: ['planning'], keywords: ['plan', 'schedule', 'organize', 'strategy', 'roadmap', 'timeline'] },
    { skills: ['mentoring'], keywords: ['mentor', 'teach', 'guide', 'help', 'train', 'coach', 'support'] },
    { skills: ['documentation'], keywords: ['document', 'write', 'docs', 'readme', 'guide', 'record'] },
    { skills: ['testing'], keywords: ['test', 'qa', 'quality', 'bug', 'validate', 'verify', 'check'] },
    { skills: ['design'], keywords: ['design', 'ui', 'ux', 'interface', 'visual', 'layout', 'aesthetic'] },
    
    // More specific conventional skills
    { skills: ['project management'], keywords: ['project', 'deadline', 'deliver', 'milestone', 'scope', 'timeline'] },
    { skills: ['data analysis'], keywords: ['data', 'metrics', 'analytics', 'insights', 'report', 'dashboard'] },
    { skills: ['client relations'], keywords: ['client', 'customer', 'stakeholder', 'requirements', 'business'] },
    { skills: ['code review'], keywords: ['review', 'code review', 'feedback', 'quality', 'standards'] },
    
    // Unconventional skills - more specific detection
    { skills: ['space beautifying'], keywords: ['beauty', 'beautiful', 'aesthetic', 'well-dressed', 'appearance', 'visual appeal'] },
    { skills: ['orderliness'], keywords: ['clean', 'organize', 'tidy', 'order', 'orderly', 'neat', 'structure'] },
    { skills: ['daily rituals'], keywords: ['daily', 'check-in', 'routine', 'ritual', 'regular', 'consistent'] },
    { skills: ['trip guiding'], keywords: ['trip', 'guide', 'journey', 'experience', 'lead through'] },
    { skills: ['shamanic work'], keywords: ['shaman', 'shamanic', 'psychedelic', 'spiritual', 'healing', 'ceremony'] },
    { skills: ['moderating'], keywords: ['moderate', 'facilitate', 'host', 'run meetings', 'discussion'] },
    { skills: ['atmosphere creation'], keywords: ['atmosphere', 'vibe', 'energy', 'mood', 'environment', 'space'] },
    { skills: ['wellness facilitation'], keywords: ['wellness', 'wellbeing', 'health', 'care', 'healing'] },
    { skills: ['community building'], keywords: ['community', 'bring together', 'connect', 'network', 'social'] },
    { skills: ['creative thinking'], keywords: ['creative', 'innovative', 'original', 'unique', 'artistic'] },
    { skills: ['intuitive guidance'], keywords: ['intuitive', 'instinct', 'feeling', 'sense', 'guidance'] }
  ];

  const detectedSkills: string[] = [];

  // Detect skills based on keywords
  skillDetection.forEach(({ skills, keywords }) => {
    const hasSkill = keywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}`, 'i');
      return regex.test(text);
    });
    
    if (hasSkill) {
      detectedSkills.push(...skills);
    }
  });

  // Remove duplicates
  const uniqueSkills = [...new Set(detectedSkills)];

  // If no skills detected, return a generic response
  if (uniqueSkills.length === 0) {
    return "No specific skills clearly identified from the contributions.";
  }

  // Limit to top 5-6 skills to keep it concise
  const topSkills = uniqueSkills.slice(0, 6);

  // Format as a simple list
  return topSkills.join(', ');
}