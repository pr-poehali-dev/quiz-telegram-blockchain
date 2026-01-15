import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Icon from '@/components/ui/icon';
import { api, Room } from '@/lib/api';
import { hapticFeedback } from '@/lib/telegram';
import { useToast } from '@/hooks/use-toast';

interface GameRoomProps {
  roomId: string;
  currentUserId: number;
  onLeaveRoom: () => void;
}

interface ChatMessage {
  id: number;
  telegram_id: number;
  first_name: string;
  username?: string;
  avatar_emoji: string;
  message: string;
  created_at: string;
}

export default function GameRoom({ roomId, currentUserId, onLeaveRoom }: GameRoomProps) {
  const { toast } = useToast();
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [lastMessageId, setLastMessageId] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoomData();
    loadMessages();
    
    const roomInterval = setInterval(loadRoomData, 2000);
    const chatInterval = setInterval(loadMessages, 1000);
    
    return () => {
      clearInterval(roomInterval);
      clearInterval(chatInterval);
    };
  }, [roomId]);

  const loadRoomData = async () => {
    try {
      const roomData = await api.rooms.getRoom(roomId);
      setRoom(roomData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load room:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные комнаты',
        variant: 'destructive'
      });
    }
  };

  const loadMessages = async () => {
    try {
      const data = await api.chat.getMessages(roomId, lastMessageId);
      if (data.messages && data.messages.length > 0) {
        setMessages(prev => [...prev, ...data.messages]);
        setLastMessageId(data.messages[data.messages.length - 1].id);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    hapticFeedback('light');
    
    try {
      await api.chat.sendMessage(roomId, currentUserId, newMessage);
      setNewMessage('');
      setTimeout(loadMessages, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось отправить сообщение',
        variant: 'destructive'
      });
    }
  };

  const handleLeave = () => {
    hapticFeedback('medium');
    onLeaveRoom();
  };

  if (loading || !room) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4 animate-bounce">⏳</div>
        <p className="text-gray-400">Загрузка комнаты...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleLeave}
          className="text-gray-400 hover:text-white"
        >
          <Icon name="ArrowLeft" size={20} className="mr-2" />
          Назад
        </Button>
        <Badge className="bg-[#0EA5E9] text-white px-4 py-2">
          {room.status === 'waiting' ? 'Ожидание игроков' : 'В игре'}
        </Badge>
      </div>

      <Card className="bg-[#1e293b] border-2 border-[#334155] p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#0EA5E9] to-[#8B5CF6] rounded-full flex items-center justify-center text-3xl">
            🎮
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{room.room_name}</h2>
            <p className="text-sm text-gray-400">ID: {room.room_id}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <Icon name="Users" size={16} />
            <span>{room.current_players} / {room.max_players} игроков</span>
          </div>
          {room.payment_type && (
            <Badge variant="outline" className="text-xs">
              {room.payment_type === 'ad' ? '📺 Реклама' : '💎 TON'}
            </Badge>
          )}
        </div>
      </Card>

      <Card className="bg-[#1e293b] border-2 border-[#334155] p-4">
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Icon name="Users" size={20} className="text-[#0EA5E9]" />
          Игроки в комнате
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {room.players?.map((player) => (
            <div
              key={player.telegram_id}
              className={`p-3 rounded-lg ${
                player.telegram_id === currentUserId
                  ? 'bg-[#0EA5E9]/20 border-2 border-[#0EA5E9]'
                  : 'bg-[#334155]'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="text-3xl">{player.avatar_emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">
                    {player.first_name}
                  </div>
                  <div className="text-xs text-gray-400">
                    Счёт: {player.score}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="bg-[#1e293b] border-2 border-[#334155] h-[400px] flex flex-col">
        <div className="p-4 border-b border-[#334155]">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Icon name="MessageCircle" size={20} className="text-[#8B5CF6]" />
            Чат комнаты
          </h3>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Icon name="MessageCircle" size={32} className="mx-auto mb-2 opacity-50" />
                <p>Начните общение!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 animate-fade-in ${
                    msg.telegram_id === currentUserId ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <Avatar className="w-8 h-8 bg-[#334155] flex-shrink-0">
                    <AvatarFallback className="bg-[#475569] text-white text-sm">
                      {msg.avatar_emoji}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex-1 ${msg.telegram_id === currentUserId ? 'text-right' : ''}`}>
                    <div className="text-xs text-gray-400 mb-1">
                      {msg.first_name}
                    </div>
                    <div
                      className={`inline-block px-3 py-2 rounded-lg max-w-[85%] break-words ${
                        msg.telegram_id === currentUserId
                          ? 'bg-[#0EA5E9] text-white'
                          : 'bg-[#334155] text-white'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-[#334155] flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Введите сообщение..."
            className="bg-[#334155] border-[#475569] text-white placeholder:text-gray-400"
          />
          <Button
            onClick={sendMessage}
            size="icon"
            className="bg-[#8B5CF6] hover:bg-[#7C3AED]"
          >
            <Icon name="Send" size={20} />
          </Button>
        </div>
      </Card>

      {room.status === 'waiting' && (
        <Card className="bg-gradient-to-r from-[#0EA5E9] to-[#8B5CF6] border-0 p-6 text-center">
          <div className="text-5xl mb-3">⏳</div>
          <h3 className="text-xl font-bold text-white mb-2">Ожидание игроков</h3>
          <p className="text-white/80 mb-4">
            Игра начнётся, когда все будут готовы
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={handleLeave}
              variant="outline"
              className="bg-white/20 border-white/40 text-white hover:bg-white/30"
            >
              Покинуть комнату
            </Button>
            <Button
              className="bg-white text-[#0EA5E9] hover:bg-gray-100"
            >
              Готов к игре
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
