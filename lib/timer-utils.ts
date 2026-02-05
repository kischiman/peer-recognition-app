export function getRemainingTime(endTime: Date | string): {
  total: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
} {
  const end = new Date(endTime).getTime();
  const now = new Date().getTime();
  const total = end - now;
  
  if (total <= 0) {
    return {
      total: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true
    };
  }
  
  const hours = Math.floor(total / (1000 * 60 * 60));
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((total % (1000 * 60)) / 1000);
  
  return {
    total,
    hours,
    minutes,
    seconds,
    isExpired: false
  };
}

export function formatTimeRemaining(endTime: Date | string): string {
  const { hours, minutes, seconds, isExpired } = getRemainingTime(endTime);
  
  if (isExpired) {
    return 'Time expired';
  }
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

export function getPhaseEndTime(epoch: any): Date | null {
  if (!epoch) return null;
  
  if (epoch.status === 'contribution') {
    // Prefer deadline-based timing over legacy duration-based timing
    if (epoch.contributionDeadline) {
      return new Date(epoch.contributionDeadline);
    } else if (epoch.contributionEndTime) {
      return new Date(epoch.contributionEndTime);
    }
  } else if (epoch.status === 'distribution') {
    // Prefer deadline-based timing over legacy duration-based timing
    if (epoch.distributionDeadline) {
      return new Date(epoch.distributionDeadline);
    } else if (epoch.distributionEndTime) {
      return new Date(epoch.distributionEndTime);
    }
  }
  
  return null;
}