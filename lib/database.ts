import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// In-memory storage for Vercel (serverless environment)
let memoryDatabase: Database | null = null;

export interface Chapter {
  id: string;
  title: string;
  duration: string; // Keeping for backward compatibility
  contributionDuration?: number; // Legacy: Duration in hours for contribution phase
  distributionDuration?: number; // Legacy: Duration in hours for distribution phase
  contributionDeadline?: Date; // New: Absolute deadline for contribution phase
  distributionDeadline?: Date; // New: Absolute deadline for distribution phase
  participants: string[];
  status: 'setup' | 'contribution' | 'distribution' | 'finished';
  startTime?: Date;
  endTime?: Date;
  contributionEndTime?: Date;
  distributionEndTime?: Date;
  createdAt: Date;
}

// Keep Epoch as alias for backward compatibility
export type Epoch = Chapter;

export interface Participant {
  id: string;
  name: string;
  chapterId: string;
}

export interface Contribution {
  id: string;
  participantId: string; // who the contribution is ABOUT
  authorId: string; // who WROTE the description
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
  epochs: Chapter[]; // Keep as epochs for backward compatibility
  participants: Participant[];
  contributions: Contribution[];
  comments: Comment[];
  distributions: Distribution[];
}

const dbPath = path.join(process.cwd(), 'data', 'database.json');

// Check if we're in a serverless environment (like Vercel)
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || !process.env.NODE_ENV || process.env.NODE_ENV === 'production';

export function readDatabase(): Database {
  // Use in-memory storage for serverless environments
  if (isServerless) {
    if (!memoryDatabase) {
      memoryDatabase = {
        epochs: [],
        participants: [],
        contributions: [],
        comments: [],
        distributions: []
      };
    }
    return memoryDatabase;
  }

  // Use file storage for local development
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {
      epochs: [],
      participants: [],
      contributions: [],
      comments: [],
      distributions: []
    };
  }
}

export function writeDatabase(data: Database): void {
  // Use in-memory storage for serverless environments
  if (isServerless) {
    memoryDatabase = data;
    return;
  }

  // Use file storage for local development
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to write database:', error);
    // Fall back to memory storage if file write fails
    memoryDatabase = data;
  }
}

export function createChapter(title: string, participantNames: string[], contributionDeadline?: Date | string, distributionDeadline?: Date | string, contributionDuration?: number, distributionDuration?: number): Chapter {
  const db = readDatabase();
  
  // Convert deadline strings to Date objects if needed
  const contributionDeadlineDate = contributionDeadline ? new Date(contributionDeadline) : undefined;
  const distributionDeadlineDate = distributionDeadline ? new Date(distributionDeadline) : undefined;
  
  const chapter: Chapter = {
    id: uuidv4(),
    title,
    duration: contributionDeadlineDate && distributionDeadlineDate ? 
      `${Math.ceil((distributionDeadlineDate.getTime() - Date.now()) / (1000 * 60 * 60))}h` : '1h',
    contributionDuration: contributionDuration || 1, // Fallback for legacy support
    distributionDuration: distributionDuration || 0.5, // Fallback for legacy support
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
  writeDatabase(db);
  
  return chapter;
}

export function getChapter(id: string): Chapter | null {
  const db = readDatabase();
  return db.epochs.find(chapter => chapter.id === id) || null;
}

export function getActiveChapter(): Chapter | null {
  const db = readDatabase();
  return db.epochs.find(chapter => chapter.status !== 'finished') || null;
}

export function getLatestChapter(): Chapter | null {
  const db = readDatabase();
  if (db.epochs.length === 0) return null;
  
  // Sort by creation date and return the most recent
  return db.epochs.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
}

export function getAllChapters(): Chapter[] {
  const db = readDatabase();
  return db.epochs.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Keep old function names for backward compatibility
export const createEpoch = createChapter;
export const getEpoch = getChapter;
export const getActiveEpoch = getActiveChapter;
export const getLatestEpoch = getLatestChapter;
export const getAllEpochs = getAllChapters;

export function updateChapterStatus(id: string, status: Chapter['status']): void {
  const db = readDatabase();
  const chapterIndex = db.epochs.findIndex(chapter => chapter.id === id);
  
  if (chapterIndex !== -1) {
    const chapter = db.epochs[chapterIndex];
    const previousStatus = chapter.status;
    chapter.status = status;
    
    const now = new Date();
    
    if (status === 'setup') {
      // Reset to setup - clear all timing data
      chapter.startTime = undefined;
      chapter.endTime = undefined;
      chapter.contributionEndTime = undefined;
      chapter.distributionEndTime = undefined;
    } else if (status === 'contribution') {
      // Starting or restarting contribution phase
      if (previousStatus === 'setup' || !chapter.startTime) {
        chapter.startTime = now;
      }
      // Reset end time if moving back to contribution
      if (previousStatus === 'distribution' || previousStatus === 'finished') {
        chapter.endTime = undefined;
        chapter.distributionEndTime = undefined;
      }
      // Set contribution end time - prefer deadline over duration
      if (chapter.contributionDeadline) {
        chapter.contributionEndTime = new Date(chapter.contributionDeadline);
      } else {
        chapter.contributionEndTime = new Date(now.getTime() + (chapter.contributionDuration || 1) * 60 * 60 * 1000);
      }
    } else if (status === 'distribution') {
      // Starting or restarting distribution phase
      if (!chapter.startTime) {
        chapter.startTime = now;
      }
      // Reset end time if moving back to distribution
      if (previousStatus === 'finished') {
        chapter.endTime = undefined;
      }
      // Set distribution end time - prefer deadline over duration
      if (chapter.distributionDeadline) {
        chapter.distributionEndTime = new Date(chapter.distributionDeadline);
      } else {
        chapter.distributionEndTime = new Date(now.getTime() + (chapter.distributionDuration || 0.5) * 60 * 60 * 1000);
      }
    } else if (status === 'finished') {
      chapter.endTime = now;
    }
    
    writeDatabase(db);
  }
}

export function getParticipants(chapterId: string): Participant[] {
  const db = readDatabase();
  return db.participants.filter(p => p.chapterId === chapterId);
}

export function deleteChapter(id: string): boolean {
  const db = readDatabase();
  const chapterIndex = db.epochs.findIndex(chapter => chapter.id === id);
  
  if (chapterIndex !== -1) {
    // Remove the chapter
    db.epochs.splice(chapterIndex, 1);
    
    // Remove all related data
    db.participants = db.participants.filter(p => p.chapterId !== id);
    db.contributions = db.contributions.filter(c => c.chapterId !== id);
    db.comments = db.comments.filter(c => c.chapterId !== id);
    db.distributions = db.distributions.filter(d => d.chapterId !== id);
    
    writeDatabase(db);
    return true;
  }
  
  return false;
}

// Keep old function name for backward compatibility
export const updateEpochStatus = updateChapterStatus;

export function getParticipant(id: string): Participant | null {
  const db = readDatabase();
  return db.participants.find(p => p.id === id) || null;
}

export function addParticipantToChapter(chapterId: string, participantName: string): Participant | null {
  const db = readDatabase();
  
  // Check if chapter exists
  const chapter = db.epochs.find(c => c.id === chapterId);
  if (!chapter) {
    return null;
  }
  
  // Check if participant name already exists in this chapter
  const existingParticipant = db.participants.find(p => 
    p.chapterId === chapterId && p.name.toLowerCase() === participantName.toLowerCase()
  );
  if (existingParticipant) {
    return null; // Participant already exists
  }
  
  // Create new participant
  const newParticipant: Participant = {
    id: uuidv4(),
    name: participantName.trim(),
    chapterId: chapterId
  };
  
  // Add to participants list
  db.participants.push(newParticipant);
  
  // Add to chapter's participants array
  if (!chapter.participants.includes(participantName.trim())) {
    chapter.participants.push(participantName.trim());
  }
  
  writeDatabase(db);
  return newParticipant;
}

export function removeParticipantFromChapter(participantId: string): boolean {
  const db = readDatabase();
  
  // Find the participant
  const participant = db.participants.find(p => p.id === participantId);
  if (!participant) {
    return false;
  }
  
  // Find the chapter
  const chapter = db.epochs.find(c => c.id === participant.chapterId);
  if (!chapter) {
    return false;
  }
  
  // Remove participant from participants array
  const participantIndex = db.participants.findIndex(p => p.id === participantId);
  if (participantIndex !== -1) {
    db.participants.splice(participantIndex, 1);
  }
  
  // Remove from chapter's participants array
  const chapterParticipantIndex = chapter.participants.indexOf(participant.name);
  if (chapterParticipantIndex !== -1) {
    chapter.participants.splice(chapterParticipantIndex, 1);
  }
  
  // Remove all related data for this participant
  db.contributions = db.contributions.filter(c => 
    c.participantId !== participantId && c.authorId !== participantId
  );
  db.comments = db.comments.filter(c => c.participantId !== participantId);
  db.distributions = db.distributions.filter(d => d.fromParticipantId !== participantId);
  
  writeDatabase(db);
  return true;
}

export function createContribution(participantId: string, authorId: string, chapterId: string, description: string): Contribution {
  const db = readDatabase();
  
  // Always create new contribution (allow multiple contributions per person)
  const contribution: Contribution = {
    id: uuidv4(),
    participantId,
    authorId,
    chapterId,
    description,
    createdAt: new Date()
  };

  db.contributions.push(contribution);
  writeDatabase(db);
  
  return contribution;
}

export function updateContribution(contributionId: string, description: string): boolean {
  const db = readDatabase();
  const contributionIndex = db.contributions.findIndex(c => c.id === contributionId);
  
  if (contributionIndex !== -1) {
    db.contributions[contributionIndex].description = description;
    db.contributions[contributionIndex].createdAt = new Date();
    writeDatabase(db);
    return true;
  }
  
  return false;
}

export function deleteContribution(contributionId: string): boolean {
  const db = readDatabase();
  const contributionIndex = db.contributions.findIndex(c => c.id === contributionId);
  
  if (contributionIndex !== -1) {
    // Remove the contribution
    db.contributions.splice(contributionIndex, 1);
    
    // Remove all related comments
    db.comments = db.comments.filter(comment => comment.contributionId !== contributionId);
    
    // Remove all related distributions
    db.distributions = db.distributions.filter(dist => dist.toContributionId !== contributionId);
    
    writeDatabase(db);
    return true;
  }
  
  return false;
}

export function getContributions(chapterId: string): Contribution[] {
  const db = readDatabase();
  return db.contributions.filter(c => c.chapterId === chapterId);
}

export function createComment(contributionId: string, participantId: string, chapterId: string, text: string): Comment {
  const db = readDatabase();
  
  const comment: Comment = {
    id: uuidv4(),
    contributionId,
    participantId,
    chapterId,
    text,
    createdAt: new Date()
  };

  db.comments.push(comment);
  writeDatabase(db);
  
  return comment;
}

export function getComments(contributionId: string): Comment[] {
  const db = readDatabase();
  return db.comments.filter(c => c.contributionId === contributionId);
}

export function distributePoints(fromParticipantId: string, distributions: Array<{contributionId: string, points: number}>, chapterId: string): void {
  const db = readDatabase();
  
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
  writeDatabase(db);
}

export function getDistributions(chapterId: string): Distribution[] {
  const db = readDatabase();
  return db.distributions.filter(d => d.chapterId === chapterId);
}

export function getParticipantDistributions(participantId: string, chapterId: string): Distribution[] {
  const db = readDatabase();
  return db.distributions.filter(d => d.fromParticipantId === participantId && d.chapterId === chapterId);
}