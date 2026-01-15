import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Icon from '@/components/ui/icon';
import { api } from '@/lib/api';
import { hapticFeedback } from '@/lib/telegram';

interface CreateRoomDialogProps {
  open: boolean;
  onClose: () => void;
  telegramId: number;
  onRoomCreated: (roomId: string) => void;
}

export default function CreateRoomDialog({ open, onClose, telegramId, onRoomCreated }: CreateRoomDialogProps) {
  const [roomName, setRoomName] = useState('Моя комната');
  const [paymentType, setPaymentType] = useState<'ad' | 'ton'>('ad');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    hapticFeedback('medium');
    
    try {
      const room = await api.rooms.create(telegramId, roomName, paymentType, false);
      hapticFeedback('success');
      onRoomCreated(room.room_id);
      onClose();
    } catch (error) {
      console.error('Failed to create room:', error);
      hapticFeedback('error');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1e293b] border-2 border-[#334155] text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Icon name="Plus" size={24} className="text-[#0EA5E9]" />
            Создать комнату
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Для создания комнаты нужно посмотреть рекламу или оплатить через TON
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="roomName" className="text-white">Название комнаты</Label>
            <Input
              id="roomName"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Введите название"
              className="bg-[#334155] border-[#475569] text-white"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-white">Способ создания</Label>
            <RadioGroup value={paymentType} onValueChange={(value) => setPaymentType(value as 'ad' | 'ton')}>
              <div className="flex items-center space-x-2 p-4 bg-[#334155] rounded-lg cursor-pointer hover:bg-[#475569] transition-colors">
                <RadioGroupItem value="ad" id="ad" />
                <Label htmlFor="ad" className="flex items-center gap-3 cursor-pointer flex-1">
                  <div className="w-12 h-12 bg-[#F97316] rounded-full flex items-center justify-center">
                    <Icon name="Play" size={24} className="text-white" />
                  </div>
                  <div>
                    <div className="font-semibold">Посмотреть рекламу</div>
                    <div className="text-sm text-gray-400">30 секунд видео</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-4 bg-[#334155] rounded-lg cursor-pointer hover:bg-[#475569] transition-colors">
                <RadioGroupItem value="ton" id="ton" />
                <Label htmlFor="ton" className="flex items-center gap-3 cursor-pointer flex-1">
                  <div className="w-12 h-12 bg-[#0EA5E9] rounded-full flex items-center justify-center">
                    <Icon name="Coins" size={24} className="text-white" />
                  </div>
                  <div>
                    <div className="font-semibold">Оплатить через TON</div>
                    <div className="text-sm text-gray-400">0.5 TON</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 bg-[#334155] border-[#475569] text-white hover:bg-[#475569]"
          >
            Отмена
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !roomName.trim()}
            className="flex-1 bg-gradient-to-r from-[#0EA5E9] to-[#8B5CF6] hover:opacity-90"
          >
            {isCreating ? 'Создаём...' : 'Создать'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
