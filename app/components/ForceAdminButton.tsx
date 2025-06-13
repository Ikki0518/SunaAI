"use client"

export default function ForceAdminButton() {
  console.log('🚨 [FORCE ADMIN BUTTON] Component is rendering!');
  
  return (
    <>
      {/* 右上の管理者ボタン - 最大限目立つ */}
      <div
        style={{
          position: 'fixed',
          top: '0px',
          right: '0px',
          zIndex: 99999999,
          backgroundColor: '#ff0000',
          color: 'white',
          padding: '30px 40px',
          borderRadius: '0 0 0 20px',
          fontWeight: 'bold',
          fontSize: '24px',
          border: '6px solid #ffffff',
          boxShadow: '0 15px 40px rgba(255,0,0,1)',
          cursor: 'pointer',
          animation: 'pulse 1s infinite',
          transform: 'scale(1.3)',
          textAlign: 'center',
          minWidth: '250px',
          fontFamily: 'Arial, sans-serif'
        }}
        onClick={() => {
          console.log('🚨 [ADMIN BUTTON] Clicked!');
          window.location.href = '/admin';
        }}
      >
        🚨 管理者サイト 🚨
      </div>
      
      {/* 左上にも配置 - より目立つ */}
      <div
        style={{
          position: 'fixed',
          top: '0px',
          left: '0px',
          zIndex: 99999999,
          backgroundColor: '#00ff00',
          color: 'black',
          padding: '20px 30px',
          borderRadius: '0 0 20px 0',
          fontWeight: 'bold',
          fontSize: '20px',
          border: '4px solid #000000',
          boxShadow: '0 10px 25px rgba(0,255,0,0.8)',
          cursor: 'pointer',
          transform: 'scale(1.2)',
          fontFamily: 'Arial, sans-serif'
        }}
        onClick={() => {
          console.log('🔧 [ADMIN BUTTON] Clicked!');
          window.location.href = '/admin';
        }}
      >
        🔧 ADMIN
      </div>
      
      {/* 中央上部にも配置 - 絶対に見逃せない */}
      <div
        style={{
          position: 'fixed',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%) scale(1.4)',
          zIndex: 99999999,
          backgroundColor: '#ff6600',
          color: 'white',
          padding: '25px 50px',
          borderRadius: '25px',
          fontWeight: 'bold',
          fontSize: '22px',
          border: '5px solid #ffffff',
          boxShadow: '0 12px 35px rgba(255,102,0,0.9)',
          cursor: 'pointer',
          animation: 'pulse 0.8s infinite',
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif'
        }}
        onClick={() => {
          console.log('🎯 [CENTER ADMIN BUTTON] Clicked!');
          window.location.href = '/admin';
        }}
      >
        🎯 管理者ダッシュボード 🎯
      </div>
    </>
  )
}