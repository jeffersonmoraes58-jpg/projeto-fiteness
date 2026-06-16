'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  senderId: string;
  content?: string;
  type?: string;
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
}

export function ChatBubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  const [lightbox, setLightbox] = useState(false);

  return (
    <motion.div
      key={msg.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex', isMine ? 'justify-end' : 'justify-start')}
    >
      <div className={cn(
        'max-w-[75%] rounded-2xl text-sm overflow-hidden',
        isMine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'glass rounded-bl-sm',
        msg.type === 'IMAGE' ? 'p-1' : 'px-4 py-2.5',
      )}>
        {msg.type === 'IMAGE' && msg.fileUrl ? (
          <>
            <img
              src={msg.fileUrl}
              alt="imagem"
              className="max-w-[220px] max-h-[220px] object-cover rounded-xl cursor-pointer"
              onClick={() => setLightbox(true)}
            />
            {lightbox && (
              <div
                className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                onClick={() => setLightbox(false)}
              >
                <img src={msg.fileUrl} alt="" className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain" />
              </div>
            )}
            <div className={cn('text-[10px] mt-1 px-2 pb-1', isMine ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground')}>
              {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </>
        ) : msg.type === 'VOICE' && msg.fileUrl ? (
          <>
            <audio controls src={msg.fileUrl} className="h-9 max-w-[220px]" />
            <div className={cn('text-[10px] mt-1', isMine ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground')}>
              {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </>
        ) : msg.type === 'FILE' && msg.fileUrl ? (
          <>
            <a
              href={msg.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:opacity-80 transition-all"
            >
              <FileText className="w-5 h-5 flex-shrink-0" />
              <span className="truncate max-w-[150px] text-xs">{msg.fileName || msg.content || 'Arquivo'}</span>
              <Download className="w-4 h-4 flex-shrink-0 ml-auto" />
            </a>
            <div className={cn('text-[10px] mt-1', isMine ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground')}>
              {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </>
        ) : (
          <>
            <p>{msg.content}</p>
            <div className={cn('text-[10px] mt-1', isMine ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground')}>
              {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
