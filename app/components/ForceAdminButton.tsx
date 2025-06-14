"use client"

// CACHE BUSTER: 2025-06-14 12:44 - FORCE REFRESH
export default function ForceAdminButton() {
  console.log('🚨 [FORCE ADMIN BUTTON] Component is rendering! Timestamp: 2025-06-14 12:44');
  
  return (
    <div 
      style={{
        position: 'fixed',
        top: '0px',
        right: '0px',
        width: '300px',
        height: '100px',
        backgroundColor: 'red',
        color: 'white',
        zIndex: 999999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        fontWeight: 'bold',
        cursor: 'pointer',
        border: '5px solid yellow'
      }}
      onClick={() => {
        console.log('🚨 [ADMIN BUTTON] Clicked!');
        window.location.href = '/admin';
      }}
    >
      🚨 管理者サイト 🚨
    </div>
  )
}