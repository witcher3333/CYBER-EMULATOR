import { AvatarState } from '@/components/Avatar';

export interface LeaderboardPlayer {
  rank: number;
  empId: string;
  name: string;
  username: string;
  role: string;
  score: number;
  xp: number;
  coins: number;
  badgeColor: string;
  avatar: AvatarState;
}

export interface FloatingEmoji {
  id: string;
  empId: string;
  emoji: string;
  senderName?: string;
}

export interface FloatingStat {
  id: string;
  empId: string;
  type: 'xp_up' | 'coins_down';
  amount: number;
}
