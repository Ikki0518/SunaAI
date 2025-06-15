"use client"

// CACHE BUSTER: 2025-06-14 12:44 - FORCE REFRESH
import { useSession } from "next-auth/react"

export default function ForceAdminButton() {
  const { data: session, status } = useSession();

  // 管理者判定
  const isAdmin = session?.user?.email === 'ikki_y0518@icloud.com' ||
                  session?.user?.email === 'ikkiyamamoto0518@gmail.com';

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
        if (isAdmin) {
          window.location.href = '/admin/dashboard';
        } else {
          window.location.href = '/admin';
        }
      }}
    >
      🚨 管理者サイト 🚨
    </div>
  )
}