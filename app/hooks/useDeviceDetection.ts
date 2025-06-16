'use client';

import { useState, useEffect } from 'react';

export function useDeviceDetection() {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const checkDevice = () => {
      // ユーザーエージェントでモバイルデバイスを検出
      const userAgent = navigator.userAgent;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      
      // 画面幅でも判定（768px以下をモバイルとする）
      const isSmallScreen = window.innerWidth <= 768;
      
      // ユーザーエージェントまたは画面幅でモバイル判定
      const isMobileDevice = mobileRegex.test(userAgent) || isSmallScreen;
      
      setIsMobile(isMobileDevice);
    };

    checkDevice();

    // リサイズイベントで画面幅の変更を監視
    const handleResize = () => {
      const isSmallScreen = window.innerWidth <= 768;
      const userAgent = navigator.userAgent;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isMobileDevice = mobileRegex.test(userAgent) || isSmallScreen;
      
      setIsMobile(isMobileDevice);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return { isMobile, mounted };
} 