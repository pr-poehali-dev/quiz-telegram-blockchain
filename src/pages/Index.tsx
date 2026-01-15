import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Player {
  id: number;
  name: string;
  score: number;
  color: string;
  avatar: string;
  isCorrect?: boolean | null;
}

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
  }
];

export default function Index() {
  const [currentUser] = useState<Player>({
    id: 1,
    name: 'Игрок 1',
    score: 0,
    color: 'bg-[#0EA5E9]',
    avatar: '🎮'
  });

  const [players, setPlayers] = useState<Player[]>([
    { id: 1, name: 'Игрок 1', score: 0, color: 'bg-[#0EA5E9]', avatar: '🎮' },
    { id: 2, name: 'Игрок 2', score: 0, color: 'bg-[#8B5CF6]', avatar: '🎯' },
    { id: 3, name: 'Игрок 3', score: 0, color: 'bg-[#F97316]', avatar: '🚀' }
  ]);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 1, userId: 2, userName: 'Игрок 2', message: 'Привет всем! Готовы к викторине?', timestamp: new Date() },
    { id: 2, userId: 3, userName: 'Игрок 3', message: 'Да! Поехали! 🚀', timestamp: new Date() }
  ]);
  const [newMessage, setNewMessage] = useState('');

  const handleAnswer = (answerIndex: number, playerId: number) => {
    setSelectedAnswer(answerIndex);
    const isCorrect = answerIndex === questions[currentQuestion].correctAnswer;
    
    setPlayers(prev => prev.map(p => {
      if (p.id === playerId) {
        return {
          ...p,
          score: isCorrect ? p.score + 10 : p.score,
          isCorrect: isCorrect
        };
      }
      return { ...p, isCorrect: Math.random() > 0.5 };
    }));

    setShowResult(true);

    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedAnswer(null);
        setShowResult(false);
        setPlayers(prev => prev.map(p => ({ ...p, isCorrect: null })));
      }
    }, 2000);
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      setChatMessages(prev => [...prev, {
        id: prev.length + 1,
        userId: currentUser.id,
        userName: currentUser.name,
        message: newMessage,
        timestamp: new Date()
      }]);
      setNewMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1f35] via-[#0f172a] to-[#1e293b] p-4 pb-20">
      <Tabs defaultValue="quiz" className="w-full max-w-md mx-auto">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-[#1e293b] border-2 border-[#334155]">
          <TabsTrigger value="quiz" className="data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white">
            <Icon name="Brain" size={18} className="mr-2" />
            Викторина
          </TabsTrigger>
          <TabsTrigger value="chat" className="data-[state=active]:bg-[#8B5CF6] data-[state=active]:text-white">
            <Icon name="MessageCircle" size={18} className="mr-2" />
            Чат
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

          <div className="grid grid-cols-3 gap-3 mb-6">
            {players.map((player) => (
              <Card
                key={player.id}
                className={`p-3 ${player.color} border-4 border-white/20 relative overflow-hidden transition-all duration-300 ${
                  player.isCorrect === true ? 'animate-bounce-in border-green-400' :
                  player.isCorrect === false ? 'opacity-50 border-red-400' : ''
                }`}
              >
                {player.isCorrect === true && (
                  <div className="absolute top-1 right-1">
                    <Icon name="Check" size={20} className="text-green-400" />
                  </div>
                )}
                {player.isCorrect === false && (
                  <div className="absolute top-1 right-1">
                    <Icon name="X" size={20} className="text-red-400" />
                  </div>
                )}
                
                <div className="flex flex-col items-center">
                  <div className="text-4xl mb-2 bg-white/20 rounded-full w-16 h-16 flex items-center justify-center">
                    {player.avatar}
                  </div>
                  <div className="text-white font-semibold text-sm text-center truncate w-full">
                    {player.name}
                  </div>
                  <div className="bg-white/90 text-gray-900 font-bold px-3 py-1 rounded-full mt-2 text-sm">
                    {player.score} 🏆
                  </div>
                </div>
              </Card>
            ))}
          </div>

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
                  onClick={() => !showResult && handleAnswer(index, currentUser.id)}
                  disabled={showResult}
                  className={`w-full h-auto py-4 px-6 text-lg font-semibold transition-all duration-300 ${
                    showResult && index === questions[currentQuestion].correctAnswer
                      ? 'bg-green-500 hover:bg-green-500 border-2 border-green-300 text-white'
                      : showResult && selectedAnswer === index
                      ? 'bg-red-500 hover:bg-red-500 border-2 border-red-300 text-white'
                      : 'bg-[#334155] hover:bg-[#475569] text-white border-2 border-[#475569]'
                  } ${!showResult && 'hover:scale-105 hover:border-[#0EA5E9]'}`}
                >
                  {option}
                </Button>
              ))}
            </div>
          </Card>

          {currentQuestion === questions.length - 1 && showResult && (
            <Card className="bg-gradient-to-r from-[#0EA5E9] to-[#8B5CF6] border-0 p-6 animate-bounce-in">
              <div className="text-center text-white">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold mb-2">Викторина завершена!</h2>
                <p className="text-lg">Ваш счёт: {players[0].score} баллов</p>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="chat" className="animate-fade-in">
          <Card className="bg-[#1e293b] border-2 border-[#334155] h-[600px] flex flex-col">
            <div className="p-4 border-b border-[#334155]">
              <h2 className="text-xl font-bold text-white flex items-center">
                <Icon name="MessageCircle" size={24} className="mr-2 text-[#8B5CF6]" />
                Чат викторины
              </h2>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 animate-fade-in ${
                      msg.userId === currentUser.id ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <Avatar className="w-10 h-10 bg-[#334155]">
                      <AvatarFallback className="bg-[#475569] text-white font-bold">
                        {msg.userName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex-1 ${msg.userId === currentUser.id ? 'text-right' : ''}`}>
                      <div className="text-xs text-gray-400 mb-1">{msg.userName}</div>
                      <div
                        className={`inline-block px-4 py-2 rounded-2xl max-w-[80%] ${
                          msg.userId === currentUser.id
                            ? 'bg-[#0EA5E9] text-white'
                            : 'bg-[#334155] text-white'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  </div>
                ))}
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
        </TabsContent>

        <TabsContent value="profile" className="animate-fade-in">
          <Card className="bg-[#1e293b] border-2 border-[#334155] p-6">
            <div className="flex flex-col items-center mb-6">
              <div className="text-7xl mb-4 bg-gradient-to-br from-[#0EA5E9] to-[#8B5CF6] rounded-full w-32 h-32 flex items-center justify-center">
                {currentUser.avatar}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{currentUser.name}</h2>
              <Badge className="bg-[#F97316] text-white text-lg px-4 py-2">
                ID: TG{currentUser.id}
              </Badge>
            </div>

            <div className="space-y-4">
              <Card className="bg-[#334155] border-0 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#0EA5E9] rounded-full flex items-center justify-center">
                      <Icon name="Trophy" size={24} className="text-white" />
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm">Текущий счёт</div>
                      <div className="text-2xl font-bold text-white">{currentUser.score}</div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-[#334155] border-0 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#8B5CF6] rounded-full flex items-center justify-center">
                      <Icon name="Target" size={24} className="text-white" />
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm">Правильных ответов</div>
                      <div className="text-2xl font-bold text-white">{Math.floor(currentUser.score / 10)}</div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-[#334155] border-0 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#F97316] rounded-full flex items-center justify-center">
                      <Icon name="Zap" size={24} className="text-white" />
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm">Игр сыграно</div>
                      <div className="text-2xl font-bold text-white">1</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-[#0EA5E9]/20 to-[#8B5CF6]/20 rounded-lg border border-[#0EA5E9]/30">
              <div className="flex items-start gap-3">
                <Icon name="Info" size={20} className="text-[#0EA5E9] mt-1" />
                <div className="text-sm text-gray-300">
                  <div className="font-semibold text-white mb-1">О викторине</div>
                  Проверьте свои знания о блокчейне TON и Павле Дурове! Правильный ответ = 10 баллов 🏆
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
