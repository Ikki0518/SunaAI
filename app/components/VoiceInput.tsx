"use client";

import { useState, useEffect, useRef } from 'react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  language?: string;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  language: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
}

export default function VoiceInput({ 
  onTranscript, 
  onError, 
  disabled = false,
  language = 'ja-JP'
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // ブラウザサポートをチェック
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.language = language;

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        const currentTranscript = finalTranscript || interimTranscript;
        setTranscript(currentTranscript);

        if (finalTranscript) {
          onTranscript(finalTranscript.trim());
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setTranscript('');
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        setTranscript('');
        
        let errorMessage = '音声認識エラーが発生しました';
        switch (event.error) {
          case 'no-speech':
            errorMessage = '音声が検出されませんでした';
            break;
          case 'audio-capture':
            errorMessage = 'マイクにアクセスできません';
            break;
          case 'not-allowed':
            errorMessage = 'マイクへのアクセスが許可されていません';
            break;
          case 'network':
            errorMessage = 'ネットワークエラーが発生しました';
            break;
          case 'language-not-supported':
            errorMessage = 'この言語はサポートされていません';
            break;
          default:
            errorMessage = `音声認識エラー: ${event.error}`;
        }
        
        if (onError) {
          onError(errorMessage);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, onTranscript, onError]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        if (onError) {
          onError('音声認識を開始できませんでした');
        }
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <button
        type="button"
        disabled={true}
        className="p-2 text-gray-300 cursor-not-allowed"
        title="このブラウザは音声入力をサポートしていません"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12" />
        </svg>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        className={`
          p-2 rounded-lg transition-all duration-200 flex items-center justify-center
          ${isListening 
            ? 'bg-red-100 text-red-600 hover:bg-red-200 animate-pulse' 
            : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title={isListening ? '音声入力を停止' : '音声入力を開始'}
      >
        {isListening ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h12v12H6z"/>
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>
      
      {/* 音声認識中のフィードバック */}
      {isListening && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap z-10">
          {transcript || '聞いています...'}
        </div>
      )}
    </div>
  );
}