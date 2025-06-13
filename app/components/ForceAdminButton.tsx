"use client"

export default function ForceAdminButton() {
  return (
    <>
      {/* 右上の管理者ボタン */}
      <div
        style={{
          position: 'fixed',
          top: '5px',
          right: '5px',
          zIndex: 9999999,
          backgroundColor: '#ff0000',
          color: 'white',
          padding: '25px 35px',
          borderRadius: '15px',
          fontWeight: 'bold',
          fontSize: '20px',
          border: '5px solid #ffffff',
          boxShadow: '0 10px 30px rgba(255,0,0,0.8)',
          cursor: 'pointer',
          animation: 'pulse 1.5s infinite',
          transform: 'scale(1.2)',
          textAlign: 'center',
          minWidth: '200px'
        }}
        onClick={() => window.location.href = '/admin'}
      >
        🚨 管理者サイト 🚨
      </div>
      
      {/* 左上にも配置 */}
      <div
        style={{
          position: 'fixed',
          top: '5px',
          left: '5px',
          zIndex: 9999999,
          backgroundColor: '#00ff00',
          color: 'black',
          padding: '15px 25px',
          borderRadius: '10px',
          fontWeight: 'bold',
          fontSize: '16px',
          border: '3px solid #000000',
          boxShadow: '0 8px 20px rgba(0,255,0,0.6)',
          cursor: 'pointer',
          transform: 'scale(1.1)'
        }}
        onClick={() => window.location.href = '/admin'}
      >
        🔧 ADMIN
      </div>
    </>
  )
}