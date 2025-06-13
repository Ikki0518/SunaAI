"use client"

export default function ForceAdminButton() {
  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 999999,
        backgroundColor: '#ff0000',
        color: 'white',
        padding: '20px 30px',
        borderRadius: '12px',
        fontWeight: 'bold',
        fontSize: '18px',
        border: '4px solid #ffffff',
        boxShadow: '0 8px 24px rgba(255,0,0,0.5)',
        cursor: 'pointer',
        animation: 'pulse 2s infinite',
        transform: 'scale(1.1)'
      }}
      onClick={() => window.location.href = '/admin'}
    >
      🚨 管理者サイト 🚨
    </div>
  )
}