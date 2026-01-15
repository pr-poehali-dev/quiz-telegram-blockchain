const API_BASE = {
  auth: 'https://functions.poehali.dev/12a78a1f-85e5-4588-a00d-14365ce0944e',
  rooms: 'https://functions.poehali.dev/a67b950c-6260-4d8c-9b86-c3c91bac111d',
  game: 'https://functions.poehali.dev/12352cee-dc57-439a-9520-d5928b310388'
};

export interface User {
  telegram_id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  avatar_emoji: string;
  total_score: number;
  games_played: number;
  correct_answers: number;
  referral_code: string;
  referral_bonus: number;
}

export interface Room {
  room_id: string;
  creator_telegram_id: number;
  room_name: string;
  is_private: boolean;
  max_players: number;
  current_players: number;
  status: string;
  payment_type?: string;
  creator_username?: string;
  creator_name?: string;
  players?: Array<{
    telegram_id: number;
    username?: string;
    first_name: string;
    avatar_emoji: string;
    score: number;
  }>;
}

export const api = {
  auth: {
    async login(telegramId: number, username?: string, firstName?: string, lastName?: string, referralCode?: string): Promise<User> {
      const response = await fetch(API_BASE.auth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: telegramId,
          username,
          first_name: firstName,
          last_name: lastName,
          referral_code: referralCode
        })
      });
      return response.json();
    },
    
    async getUser(telegramId: number): Promise<User> {
      const response = await fetch(`${API_BASE.auth}?telegram_id=${telegramId}`);
      return response.json();
    }
  },
  
  rooms: {
    async create(telegramId: number, roomName: string, paymentType: string, isPrivate = false): Promise<Room> {
      const response = await fetch(API_BASE.rooms, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          telegram_id: telegramId,
          room_name: roomName,
          payment_type: paymentType,
          is_private: isPrivate
        })
      });
      return response.json();
    },
    
    async join(telegramId: number, roomId: string): Promise<{ success: boolean; room_id: string }> {
      const response = await fetch(API_BASE.rooms, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          telegram_id: telegramId,
          room_id: roomId
        })
      });
      return response.json();
    },
    
    async getRoom(roomId: string): Promise<Room> {
      const response = await fetch(`${API_BASE.rooms}?room_id=${roomId}`);
      return response.json();
    },
    
    async listPublicRooms(): Promise<{ rooms: Room[] }> {
      const response = await fetch(API_BASE.rooms);
      return response.json();
    }
  },
  
  game: {
    async complete(telegramId: number, roomId: string, score: number, correctAnswers: number) {
      const response = await fetch(API_BASE.game, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          telegram_id: telegramId,
          room_id: roomId,
          score,
          correct_answers: correctAnswers
        })
      });
      return response.json();
    },
    
    async getLeaderboard(limit = 10) {
      const response = await fetch(`${API_BASE.game}?action=leaderboard&limit=${limit}`);
      return response.json();
    }
  }
};
