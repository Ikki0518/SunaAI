"use client"

export default function ForceAdminButton() {
  return (
    <div 
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 99999,
        backgroundColor: '#dc2626',
        color: 'white',
        padding: '12px 24px',
        borderRadius: '8px',
        fontWeight: 'bold',
        fontSize: '16px',
        border: '3px solid #991b1b',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        cursor: 'pointer'
      }}
      onClick={() => window.location.href = '/admin'}
    >
      🔧 管理者サイト
    </div>
  )
}