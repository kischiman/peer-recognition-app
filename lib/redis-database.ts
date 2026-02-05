import { Redis } from '@upstash/redis';
import { v4 as uuidv4 } from 'uuid';

// Types (reusing from database.ts)
export interface Chapter {
  id: string;
  title: string;
  duration: string;
  contributionDuration?: number;
  distributionDuration?: number;
  contributionDeadline?: Date;
  distributionDeadline?: Date;
  participants: string[];
  status: 'setup' | 'contribution' | 'distribution' | 'finished';
  startTime?: Date;
  endTime?: Date;
  contributionEndTime?: Date;
  distributionEndTime?: Date;
  createdAt: Date;
}

export type Epoch = Chapter;

export interface Participant {
  id: string;
  name: string;
  chapterId: string;
}

export interface Contribution {
  id: string;
  participantId: string;
  authorId: string;
  chapterId: string;
  description: string;
  createdAt: Date;
}

export interface Comment {
  id: string;
  contributionId: string;
  participantId: string;
  chapterId: string;
  text: string;
  createdAt: Date;
}

export interface Distribution {
  id: string;
  fromParticipantId: string;
  toContributionId: string;
  points: number;
  chapterId: string;
  createdAt: Date;
}

interface Database {
  epochs: Chapter[];
  participants: Participant[];
  contributions: Contribution[];
  comments: Comment[];
  distributions: Distribution[];
}

// Initialize Redis client
let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    // Check for KV credentials first (your setup)
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      redis = new Redis({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
      });
    }
    // Fallback to standard Redis REST credentials
    else if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    }
    else {
      throw new Error('Missing Upstash Redis credentials. Please set KV_REST_API_URL and KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.');
    }
  }
  return redis;
}

// Database operations
export async function readDatabase(): Promise<Database> {
  try {
    const client = getRedisClient();
    const data = await client.get<Database>('peer-recognition-db');
    
    if (!data) {
      return {
        epochs: [],
        participants: [],
        contributions: [],
        comments: [],
        distributions: []
      };
    }

    // Convert date strings back to Date objects
    data.epochs = data.epochs.map(epoch => ({
      ...epoch,
      createdAt: new Date(epoch.createdAt),
      startTime: epoch.startTime ? new Date(epoch.startTime) : undefined,
      endTime: epoch.endTime ? new Date(epoch.endTime) : undefined,
      contributionEndTime: epoch.contributionEndTime ? new Date(epoch.contributionEndTime) : undefined,
      distributionEndTime: epoch.distributionEndTime ? new Date(epoch.distributionEndTime) : undefined,
      contributionDeadline: epoch.contributionDeadline ? new Date(epoch.contributionDeadline) : undefined,
      distributionDeadline: epoch.distributionDeadline ? new Date(epoch.distributionDeadline) : undefined,
    }));

    data.contributions = data.contributions.map(contrib => ({
      ...contrib,
      createdAt: new Date(contrib.createdAt)
    }));

    data.comments = data.comments.map(comment => ({
      ...comment,
      createdAt: new Date(comment.createdAt)
    }));

    data.distributions = data.distributions.map(dist => ({
      ...dist,
      createdAt: new Date(dist.createdAt)
    }));

    return data;
  } catch (error) {
    console.error('Failed to read from Redis:', error);
    return {
      epochs: [],
      participants: [],
      contributions: [],
      comments: [],
      distributions: []
    };
  }
}

export async function writeDatabase(data: Database): Promise<void> {
  try {
    const client = getRedisClient();
    await client.set('peer-recognition-db', data);
  } catch (error) {
    console.error('Failed to write to Redis:', error);
    throw error;
  }
}

// Chapter operations
export async function createChapter(
  title: string, 
  participantNames: string[], 
  contributionDeadline?: Date | string, 
  distributionDeadline?: Date | string, 
  contributionDuration?: number, 
  distributionDuration?: number
): Promise<Chapter> {
  const db = await readDatabase();
  
  const contributionDeadlineDate = contributionDeadline ? new Date(contributionDeadline) : undefined;
  const distributionDeadlineDate = distributionDeadline ? new Date(distributionDeadline) : undefined;
  
  const chapter: Chapter = {
    id: uuidv4(),
    title,
    duration: contributionDeadlineDate && distributionDeadlineDate ? 
      `${Math.ceil((distributionDeadlineDate.getTime() - Date.now()) / (1000 * 60 * 60))}h` : '1h',
    contributionDuration: contributionDuration || 1,
    distributionDuration: distributionDuration || 0.5,
    contributionDeadline: contributionDeadlineDate,
    distributionDeadline: distributionDeadlineDate,
    participants: participantNames,
    status: 'setup',
    createdAt: new Date()
  };

  db.epochs.push(chapter);

  const participants = participantNames.map(name => ({
    id: uuidv4(),
    name,
    chapterId: chapter.id
  }));

  db.participants.push(...participants);
  await writeDatabase(db);
  
  return chapter;
}

export async function getChapter(id: string): Promise<Chapter | null> {
  const db = await readDatabase();
  return db.epochs.find(chapter => chapter.id === id) || null;
}

export async function getActiveChapter(): Promise<Chapter | null> {
  const db = await readDatabase();
  return db.epochs.find(chapter => chapter.status !== 'finished') || null;
}

export async function getLatestChapter(): Promise<Chapter | null> {
  const db = await readDatabase();
  if (db.epochs.length === 0) return null;
  
  return db.epochs.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
}

export async function getAllChapters(): Promise<Chapter[]> {
  const db = await readDatabase();
  return db.epochs.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function updateChapterStatus(id: string, status: Chapter['status']): Promise<void> {
  const db = await readDatabase();
  const chapterIndex = db.epochs.findIndex(chapter => chapter.id === id);
  
  if (chapterIndex !== -1) {
    const chapter = db.epochs[chapterIndex];
    const previousStatus = chapter.status;
    chapter.status = status;
    
    const now = new Date();
    
    if (status === 'setup') {
      chapter.startTime = undefined;
      chapter.endTime = undefined;
      chapter.contributionEndTime = undefined;
      chapter.distributionEndTime = undefined;
    } else if (status === 'contribution') {
      if (previousStatus === 'setup' || !chapter.startTime) {
        chapter.startTime = now;
      }
      if (previousStatus === 'distribution' || previousStatus === 'finished') {
        chapter.endTime = undefined;
        chapter.distributionEndTime = undefined;
      }
      if (chapter.contributionDeadline) {
        chapter.contributionEndTime = new Date(chapter.contributionDeadline);
      } else {
        chapter.contributionEndTime = new Date(now.getTime() + (chapter.contributionDuration || 1) * 60 * 60 * 1000);
      }
    } else if (status === 'distribution') {
      if (!chapter.startTime) {
        chapter.startTime = now;
      }
      if (previousStatus === 'finished') {
        chapter.endTime = undefined;
      }
      if (chapter.distributionDeadline) {
        chapter.distributionEndTime = new Date(chapter.distributionDeadline);
      } else {
        chapter.distributionEndTime = new Date(now.getTime() + (chapter.distributionDuration || 0.5) * 60 * 60 * 1000);
      }
    } else if (status === 'finished') {
      chapter.endTime = now;
    }
    
    await writeDatabase(db);
  }
}

export async function deleteChapter(id: string): Promise<boolean> {
  const db = await readDatabase();
  const chapterIndex = db.epochs.findIndex(chapter => chapter.id === id);
  
  if (chapterIndex !== -1) {
    db.epochs.splice(chapterIndex, 1);
    db.participants = db.participants.filter(p => p.chapterId !== id);
    db.contributions = db.contributions.filter(c => c.chapterId !== id);
    db.comments = db.comments.filter(c => c.chapterId !== id);
    db.distributions = db.distributions.filter(d => d.chapterId !== id);
    
    await writeDatabase(db);
    return true;
  }
  
  return false;
}

// Participant operations
export async function getParticipants(chapterId: string): Promise<Participant[]> {
  const db = await readDatabase();
  return db.participants.filter(p => p.chapterId === chapterId);
}

export async function getParticipant(id: string): Promise<Participant | null> {
  const db = await readDatabase();
  return db.participants.find(p => p.id === id) || null;
}

export async function addParticipantToChapter(chapterId: string, participantName: string): Promise<Participant | null> {
  const db = await readDatabase();
  
  const chapter = db.epochs.find(c => c.id === chapterId);
  if (!chapter) {
    return null;
  }
  
  const existingParticipant = db.participants.find(p => 
    p.chapterId === chapterId && p.name.toLowerCase() === participantName.toLowerCase()
  );
  if (existingParticipant) {
    return null;
  }
  
  const newParticipant: Participant = {
    id: uuidv4(),
    name: participantName.trim(),
    chapterId: chapterId
  };
  
  db.participants.push(newParticipant);
  
  if (!chapter.participants.includes(participantName.trim())) {
    chapter.participants.push(participantName.trim());
  }
  
  await writeDatabase(db);
  return newParticipant;
}

export async function removeParticipantFromChapter(participantId: string): Promise<boolean> {
  const db = await readDatabase();
  
  const participant = db.participants.find(p => p.id === participantId);
  if (!participant) {
    return false;
  }
  
  const chapter = db.epochs.find(c => c.id === participant.chapterId);
  if (!chapter) {
    return false;
  }
  
  const participantIndex = db.participants.findIndex(p => p.id === participantId);
  if (participantIndex !== -1) {
    db.participants.splice(participantIndex, 1);
  }
  
  const chapterParticipantIndex = chapter.participants.indexOf(participant.name);
  if (chapterParticipantIndex !== -1) {
    chapter.participants.splice(chapterParticipantIndex, 1);
  }
  
  db.contributions = db.contributions.filter(c => 
    c.participantId !== participantId && c.authorId !== participantId
  );
  db.comments = db.comments.filter(c => c.participantId !== participantId);
  db.distributions = db.distributions.filter(d => d.fromParticipantId !== participantId);
  
  await writeDatabase(db);
  return true;
}

// Contribution operations
export async function createContribution(participantId: string, authorId: string, chapterId: string, description: string): Promise<Contribution> {
  const db = await readDatabase();
  
  const contribution: Contribution = {
    id: uuidv4(),
    participantId,
    authorId,
    chapterId,
    description,
    createdAt: new Date()
  };

  db.contributions.push(contribution);
  await writeDatabase(db);
  
  return contribution;
}

export async function updateContribution(contributionId: string, description: string): Promise<boolean> {
  const db = await readDatabase();
  const contributionIndex = db.contributions.findIndex(c => c.id === contributionId);
  
  if (contributionIndex !== -1) {
    db.contributions[contributionIndex].description = description;
    db.contributions[contributionIndex].createdAt = new Date();
    await writeDatabase(db);
    return true;
  }
  
  return false;
}

export async function deleteContribution(contributionId: string): Promise<boolean> {
  const db = await readDatabase();
  const contributionIndex = db.contributions.findIndex(c => c.id === contributionId);
  
  if (contributionIndex !== -1) {
    db.contributions.splice(contributionIndex, 1);
    db.comments = db.comments.filter(comment => comment.contributionId !== contributionId);
    db.distributions = db.distributions.filter(dist => dist.toContributionId !== contributionId);
    
    await writeDatabase(db);
    return true;
  }
  
  return false;
}

export async function getContributions(chapterId: string): Promise<Contribution[]> {
  const db = await readDatabase();
  return db.contributions.filter(c => c.chapterId === chapterId);
}

// Comment operations
export async function createComment(contributionId: string, participantId: string, chapterId: string, text: string): Promise<Comment> {
  const db = await readDatabase();
  
  const comment: Comment = {
    id: uuidv4(),
    contributionId,
    participantId,
    chapterId,
    text,
    createdAt: new Date()
  };

  db.comments.push(comment);
  await writeDatabase(db);
  
  return comment;
}

export async function getComments(contributionId: string): Promise<Comment[]> {
  const db = await readDatabase();
  return db.comments.filter(c => c.contributionId === contributionId);
}

// Distribution operations
export async function distributePoints(fromParticipantId: string, distributions: Array<{contributionId: string, points: number}>, chapterId: string): Promise<void> {
  const db = await readDatabase();
  
  db.distributions = db.distributions.filter(d => 
    d.fromParticipantId !== fromParticipantId || d.chapterId !== chapterId
  );

  const newDistributions = distributions.map(dist => ({
    id: uuidv4(),
    fromParticipantId,
    toContributionId: dist.contributionId,
    points: dist.points,
    chapterId,
    createdAt: new Date()
  }));

  db.distributions.push(...newDistributions);
  await writeDatabase(db);
}

export async function getDistributions(chapterId: string): Promise<Distribution[]> {
  const db = await readDatabase();
  return db.distributions.filter(d => d.chapterId === chapterId);
}

export async function getParticipantDistributions(participantId: string, chapterId: string): Promise<Distribution[]> {
  const db = await readDatabase();
  return db.distributions.filter(d => d.fromParticipantId === participantId && d.chapterId === chapterId);
}

// Legacy aliases
export const createEpoch = createChapter;
export const getEpoch = getChapter;
export const getActiveEpoch = getActiveChapter;
export const getLatestEpoch = getLatestChapter;
export const getAllEpochs = getAllChapters;
export const updateEpochStatus = updateChapterStatus;