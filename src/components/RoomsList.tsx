import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { api, Room } from '@/lib/api';
import { hapticFeedback } from '@/lib/telegram';

interface RoomsListProps {
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: () => void;
  currentUserId: number;
}

export default function RoomsList({ onJoinRoom, onCreateRoom, currentUserId }: RoomsListProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadRooms = async () => {
    try {
      const data = await api.rooms.listPublicRooms();
      setRooms(data.rooms || []);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = (roomId: string) => {
    hapticFeedback('medium');
    onJoinRoom(roomId);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4 animate-bounce">🎮</div>
        <p className="text-gray-400">Загрузка комнат...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Игровые комнаты</h2>
          <p className="text-sm text-gray-400">Активных: {rooms.length}</p>
        </div>
        <Button
          onClick={onCreateRoom}
          className="bg-gradient-to-r from-[#0EA5E9] to-[#8B5CF6]"
        >
          <Icon name="Plus" size={20} className="mr-2" />
          Создать
        </Button>
      </div>

      {rooms.length === 0 ? (
        <Card className="bg-[#1e293b] border-2 border-[#334155] p-8 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="text-xl font-bold text-white mb-2">Нет активных комнат</h3>
          <p className="text-gray-400 mb-6">Создайте первую комнату и пригласите друзей!</p>
          <Button
            onClick={onCreateRoom}
            className="bg-[#8B5CF6] hover:bg-[#7C3AED]"
          >
            <Icon name="Plus" size={20} className="mr-2" />
            Создать комнату
          </Button>
        </Card>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            {rooms.map((room) => (
              <Card
                key={room.room_id}
                className="bg-[#1e293b] border-2 border-[#334155] p-4 hover:border-[#0EA5E9] transition-all cursor-pointer"
                onClick={() => handleJoinRoom(room.room_id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#0EA5E9] to-[#8B5CF6] rounded-full flex items-center justify-center text-2xl">
                      🎮
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{room.room_name}</h3>
                      <p className="text-sm text-gray-400">
                        Создатель: {room.creator_name || room.creator_username || 'Игрок'}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={`${
                      room.status === 'waiting'
                        ? 'bg-green-500'
                        : room.status === 'playing'
                        ? 'bg-yellow-500'
                        : 'bg-gray-500'
                    } text-white`}
                  >
                    {room.status === 'waiting' ? 'Ожидание' : 'В игре'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-400">
                      <Icon name="Users" size={16} />
                      <span>
                        {room.current_players} / {room.max_players}
                      </span>
                    </div>
                    {room.payment_type && (
                      <Badge variant="outline" className="text-xs">
                        {room.payment_type === 'ad' ? '📺 Реклама' : '💎 TON'}
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="bg-[#0EA5E9] hover:bg-[#0284C7]"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJoinRoom(room.room_id);
                    }}
                  >
                    <Icon name="LogIn" size={16} className="mr-2" />
                    Войти
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
