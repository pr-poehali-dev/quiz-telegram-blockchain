import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import GameTimer from '@/components/GameTimer';
import CreateRoomDialog from '@/components/CreateRoomDialog';
import { getTelegramUser, getStartParam, initTelegramApp, shareToTelegram, hapticFeedback, mockTelegramUser, isTelegramWebApp } from '@/lib/telegram';
import { api, User, Room } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
}

interface ChatMessage {
  id: number;
  userId: number;
  userName: string;
  message: string;
  timestamp: Date;
}

const questions: Question[] = [
  {
    id: 1,
    question: 'В каком году был основан Telegram?',
    options: ['2011', '2013', '2015', '2017'],
    correctAnswer: 1,
    category: 'Telegram'
  },
  {
    id: 2,
    question: 'Как называется криптовалюта блокчейна TON?',
    options: ['Bitcoin', 'Toncoin', 'Ethereum', 'TONCoin'],
    correctAnswer: 1,
    category: 'TON'
  },
  {
    id: 3,
    question: 'Где родился Павел Дуров?',
    options: ['Москва', 'Санкт-Петербург', 'Ленинград', 'Дубай'],
    correctAnswer: 2,
    category: 'Дуров'
  },
  {
    id: 4,
    question: 'Что означает TON?',
    options: ['The Open Network', 'Telegram Open Network', 'Total Online Network', 'Tech Open Network'],
    correctAnswer: 0,
    category: 'TON'
  },
  {
    id: 5,
    question: 'Какую социальную сеть основал Павел Дуров до Telegram?',
    options: ['Одноклассники', 'ВКонтакте', 'Facebook', 'MySpace'],
    correctAnswer: 1,
    category: 'Дуров'
  },
  {
    id: 6,
    question: 'Сколько секретных чатов может быть активно в Telegram?',
    options: ['Не ограничено', '1', '5', '10'],
    correctAnswer: 0,
    category: 'Telegram'
  },
  {
    id: 7,
    question: 'Какой язык программирования используется для смарт-контрактов TON?',
    options: ['Solidity', 'FunC', 'Rust', 'Python'],
    correctAnswer: 1,
    category: 'TON'
  },
  {
    id: 8,
    question: 'В каком году Павел Дуров покинул пост CEO ВКонтакте?',
    options: ['2012', '2014', '2016', '2018'],
    correctAnswer: 1,
    category: 'Дуров'
  }
];

export default function Index() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [timerActive, setTimerActive] = useState(true);
  const [gameFinished, setGameFinished] = useState(false);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showReferralDialog, setShowReferralDialog] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    initTelegramApp();
    
    const tgUser = isTelegramWebApp() ? getTelegramUser() : mockTelegramUser();
    const referralCode = getStartParam();
    
    if (!tgUser) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось получить данные пользователя Telegram',
        variant: 'destructive'
      });
      setIsLoading(false);
      return;
    }

    try {
      const userData = await api.auth.login(
        tgUser.id,
        tgUser.username,
        tgUser.first_name,
        tgUser.last_name,
        referralCode || undefined
      );
      setUser(userData);
      
      const leaderboardData = await api.game.getLeaderboard(10);
      setLeaderboard(leaderboardData.leaderboard || []);
      
      if (referralCode) {
        toast({
          title: '🎉 Бонус получен!',
          description: '+50 баллов за переход по реферальной ссылке',
        });
      }
    } catch (error) {
      console.error('Init error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (answerIndex: number) => {
    if (showResult || !timerActive) return;
    
    hapticFeedback('light');
    setSelectedAnswer(answerIndex);
    setTimerActive(false);
    
    const isCorrect = answerIndex === questions[currentQuestion].correctAnswer;
    
    if (isCorrect) {
      setScore(prev => prev + 10);
      setCorrectAnswers(prev => prev + 1);
      hapticFeedback('success');
    } else {
      hapticFeedback('error');
    }
    
    setShowResult(true);

    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedAnswer(null);
        setShowResult(false);
        setTimerActive(true);
      } else {
        finishGame();
      }
    }, 2000);
  };

  const handleTimeout = () => {
    if (showResult) return;
    hapticFeedback('error');
    handleAnswer(-1);
  };

  const finishGame = async () => {
    setGameFinished(true);
    setTimerActive(false);
    hapticFeedback('success');
    
    if (!user) return;
    
    try {
      const roomId = currentRoom?.room_id || `solo_${user.telegram_id}_${Date.now()}`;
      await api.game.complete(user.telegram_id, roomId, score + 10, correctAnswers + 1);
      
      const updatedUser = await api.auth.getUser(user.telegram_id);
      setUser(updatedUser);
      
      const leaderboardData = await api.game.getLeaderboard(10);
      setLeaderboard(leaderboardData.leaderboard || []);
      
      toast({
        title: '🎉 Игра завершена!',
        description: `Вы набрали ${score + 10} баллов!`,
      });
    } catch (error) {
      console.error('Failed to save game:', error);
    }
  };

  const restartGame = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setCorrectAnswers(0);
    setTimerActive(true);
    setGameFinished(false);
    hapticFeedback('medium');
  };

  const handleShare = () => {
    if (!user) return;
    const shareText = `🎮 Я набрал ${user.total_score} баллов в TON Quiz! Попробуй и ты!\n\n👉 Присоединяйся по моей реферальной ссылке и получи +50 баллов!\n\nhttps://t.me/ton_quiz_game_bot?start=${user.referral_code}`;
    shareToTelegram(shareText);
    hapticFeedback('success');
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !user) return;
    
    hapticFeedback('light');
    setChatMessages(prev => [...prev, {
      id: prev.length + 1,
      userId: user.telegram_id,
      userName: user.first_name,
      message: newMessage,
      timestamp: new Date()
    }]);
    setNewMessage('');
  };

  const handleCreateRoom = (roomId: string) => {
    toast({
      title: '✅ Комната создана!',
      description: 'Пригласите друзей для игры',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1f35] via-[#0f172a] to-[#1e293b] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🚀</div>
          <div className="text-white text-xl">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1f35] via-[#0f172a] to-[#1e293b] flex items-center justify-center p-4">
        <Card className="bg-[#1e293b] border-2 border-[#334155] p-6 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-white mb-2">Ошибка загрузки</h2>
          <p className="text-gray-400">Откройте приложение через Telegram</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1f35] via-[#0f172a] to-[#1e293b] p-4 pb-20">
      <Tabs defaultValue="quiz" className="w-full max-w-md mx-auto">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-[#1e293b] border-2 border-[#334155]">
          <TabsTrigger value="quiz" className="data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white">
            <Icon name="Brain" size={18} className="mr-2" />
            Викторина
          </TabsTrigger>
          <TabsTrigger value="rooms" className="data-[state=active]:bg-[#8B5CF6] data-[state=active]:text-white">
            <Icon name="Users" size={18} className="mr-2" />
            Комнаты
          </TabsTrigger>
          <TabsTrigger value="profile" className="data-[state=active]:bg-[#F97316] data-[state=active]:text-white">
            <Icon name="User" size={18} className="mr-2" />
            Профиль
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quiz" className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-white">🎮 TON Quiz</h1>
            <Badge variant="secondary" className="bg-[#0EA5E9] text-white px-4 py-2 text-base">
              {currentQuestion + 1} / {questions.length}
            </Badge>
          </div>

          {!gameFinished && (
            <Card className="bg-[#1e293b] border-2 border-[#334155] p-4">
              <GameTimer
                duration={15}
                onTimeout={handleTimeout}
                isActive={timerActive && !showResult}
              />
            </Card>
          )}

          <Card className="bg-[#334155] border-0 p-4">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Icon name="Trophy" size={20} className="text-yellow-500" />
                <span className="font-bold">Счёт: {score}</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="Target" size={20} className="text-green-500" />
                <span className="font-bold">Правильных: {correctAnswers}</span>
              </div>
            </div>
          </Card>

          {!gameFinished ? (
            <Card className="bg-[#1e293b] border-2 border-[#334155] p-6 animate-fade-in">
              <Badge className="mb-4 bg-[#D946EF] text-white">
                {questions[currentQuestion].category}
              </Badge>
              <h2 className="text-xl font-bold text-white mb-6">
                {questions[currentQuestion].question}
              </h2>

              <div className="space-y-3">
                {questions[currentQuestion].options.map((option, index) => (
                  <Button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    disabled={showResult || !timerActive}
                    className={`w-full h-auto py-4 px-6 text-lg font-semibold transition-all duration-300 ${
                      showResult && index === questions[currentQuestion].correctAnswer
                        ? 'bg-green-500 hover:bg-green-500 border-2 border-green-300 text-white'
                        : showResult && selectedAnswer === index
                        ? 'bg-red-500 hover:bg-red-500 border-2 border-red-300 text-white'
                        : 'bg-[#334155] hover:bg-[#475569] text-white border-2 border-[#475569]'
                    } ${!showResult && timerActive && 'hover:scale-105 hover:border-[#0EA5E9]'}`}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="bg-gradient-to-r from-[#0EA5E9] to-[#8B5CF6] border-0 p-6 animate-bounce-in">
              <div className="text-center text-white">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold mb-2">Викторина завершена!</h2>
                <p className="text-lg mb-4">Ваш счёт: {score} баллов</p>
                <p className="text-sm mb-6">Правильных ответов: {correctAnswers} из {questions.length}</p>
                
                <div className="flex gap-3">
                  <Button
                    onClick={restartGame}
                    className="flex-1 bg-white text-[#0EA5E9] hover:bg-gray-100"
                  >
                    <Icon name="RotateCw" size={20} className="mr-2" />
                    Начать заново
                  </Button>
                  <Button
                    onClick={handleShare}
                    className="flex-1 bg-[#D946EF] hover:bg-[#C026D3] text-white"
                  >
                    <Icon name="Share2" size={20} className="mr-2" />
                    Поделиться
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rooms" className="animate-fade-in space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Игровые комнаты</h2>
            <Button
              onClick={() => setShowCreateRoom(true)}
              className="bg-gradient-to-r from-[#0EA5E9] to-[#8B5CF6]"
            >
              <Icon name="Plus" size={20} className="mr-2" />
              Создать
            </Button>
          </div>

          <Card className="bg-[#1e293b] border-2 border-[#334155] p-6 text-center">
            <div className="text-5xl mb-4">🎮</div>
            <h3 className="text-xl font-bold text-white mb-2">Мультиплеер скоро!</h3>
            <p className="text-gray-400 mb-4">Создавайте комнаты и играйте с друзьями</p>
            <Button
              onClick={() => setShowCreateRoom(true)}
              className="bg-[#8B5CF6] hover:bg-[#7C3AED]"
            >
              Создать комнату
            </Button>
          </Card>

          <Card className="bg-[#1e293b] border-2 border-[#334155] p-4">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Icon name="Trophy" size={20} className="text-yellow-500" />
              Таблица лидеров
            </h3>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {leaderboard.map((player, idx) => (
                  <div
                    key={player.telegram_id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      player.telegram_id === user.telegram_id
                        ? 'bg-[#0EA5E9]/20 border-2 border-[#0EA5E9]'
                        : 'bg-[#334155]'
                    }`}
                  >
                    <div className={`text-2xl font-bold ${
                      idx === 0 ? 'text-yellow-500' :
                      idx === 1 ? 'text-gray-300' :
                      idx === 2 ? 'text-orange-600' :
                      'text-gray-400'
                    }`}>
                      #{player.rank}
                    </div>
                    <div className="text-3xl">{player.avatar_emoji}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-white">{player.first_name}</div>
                      <div className="text-sm text-gray-400">{player.games_played} игр</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-white">{player.total_score}</div>
                      <div className="text-xs text-gray-400">баллов</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="animate-fade-in">
          <Card className="bg-[#1e293b] border-2 border-[#334155] p-6">
            <div className="flex flex-col items-center mb-6">
              <div className="text-7xl mb-4 bg-gradient-to-br from-[#0EA5E9] to-[#8B5CF6] rounded-full w-32 h-32 flex items-center justify-center">
                {user.avatar_emoji}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{user.first_name}</h2>
              {user.username && (
                <p className="text-gray-400 mb-2">@{user.username}</p>
              )}
              <Badge className="bg-[#F97316] text-white text-lg px-4 py-2">
                ID: {user.telegram_id}
              </Badge>
            </div>

            <div className="space-y-4 mb-6">
              <Card className="bg-[#334155] border-0 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#0EA5E9] rounded-full flex items-center justify-center">
                    <Icon name="Trophy" size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-400 text-sm">Всего баллов</div>
                    <div className="text-2xl font-bold text-white">{user.total_score}</div>
                  </div>
                </div>
              </Card>

              <Card className="bg-[#334155] border-0 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#8B5CF6] rounded-full flex items-center justify-center">
                    <Icon name="Target" size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-400 text-sm">Правильных ответов</div>
                    <div className="text-2xl font-bold text-white">{user.correct_answers}</div>
                  </div>
                </div>
              </Card>

              <Card className="bg-[#334155] border-0 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#F97316] rounded-full flex items-center justify-center">
                    <Icon name="Zap" size={24} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-400 text-sm">Игр сыграно</div>
                    <div className="text-2xl font-bold text-white">{user.games_played}</div>
                  </div>
                </div>
              </Card>

              {user.referral_bonus > 0 && (
                <Card className="bg-gradient-to-r from-[#D946EF] to-[#F97316] border-0 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <Icon name="Gift" size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white/80 text-sm">Реферальный бонус</div>
                      <div className="text-2xl font-bold text-white">+{user.referral_bonus}</div>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => setShowReferralDialog(true)}
                className="w-full bg-gradient-to-r from-[#0EA5E9] to-[#8B5CF6] hover:opacity-90"
              >
                <Icon name="Users" size={20} className="mr-2" />
                Пригласить друзей (+50 баллов)
              </Button>
              
              <Button
                onClick={handleShare}
                variant="outline"
                className="w-full bg-[#334155] border-[#475569] text-white hover:bg-[#475569]"
              >
                <Icon name="Share2" size={20} className="mr-2" />
                Поделиться результатами
              </Button>
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-[#0EA5E9]/20 to-[#8B5CF6]/20 rounded-lg border border-[#0EA5E9]/30">
              <div className="flex items-start gap-3">
                <Icon name="Info" size={20} className="text-[#0EA5E9] mt-1" />
                <div className="text-sm text-gray-300">
                  <div className="font-semibold text-white mb-1">О викторине</div>
                  Проверьте свои знания о блокчейне TON и Павле Дурове! Каждый правильный ответ = 10 баллов 🏆
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateRoomDialog
        open={showCreateRoom}
        onClose={() => setShowCreateRoom(false)}
        telegramId={user.telegram_id}
        onRoomCreated={handleCreateRoom}
      />

      <Dialog open={showReferralDialog} onOpenChange={setShowReferralDialog}>
        <DialogContent className="bg-[#1e293b] border-2 border-[#334155] text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Icon name="Gift" size={24} className="text-[#D946EF]" />
              Реферальная программа
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-[#334155] rounded-lg">
              <p className="text-sm text-gray-400 mb-2">Ваша реферальная ссылка:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-[#1e293b] rounded text-sm text-[#0EA5E9] overflow-x-auto">
                  https://t.me/ton_quiz_game_bot?start={user.referral_code}
                </code>
              </div>
            </div>
            <div className="text-center text-gray-300">
              <p>🎁 Пригласите друга и получите <span className="text-[#D946EF] font-bold">+50 баллов</span></p>
              <p className="text-sm mt-2">Ваш друг тоже получит <span className="text-[#0EA5E9] font-bold">+50 баллов</span></p>
            </div>
            <Button
              onClick={handleShare}
              className="w-full bg-gradient-to-r from-[#D946EF] to-[#F97316]"
            >
              <Icon name="Share2" size={20} className="mr-2" />
              Поделиться ссылкой
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}