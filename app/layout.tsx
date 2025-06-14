import type { Metadata } from "next";
import { Geist, Geist_Mono, Dancing_Script } from "next/font/google";
import "./globals.css";
import AuthProvider from "./providers/AuthProvider";
import { ThemeProvider } from "./contexts/ThemeContext";
import ForceAdminButton from "./components/ForceAdminButton";

// CACHE BUSTER: 2025-06-14 12:45 - FORCE LAYOUT REFRESH

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dancingScript = Dancing_Script({
  variable: "--font-dancing-script",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Suna - AIアシスタント",
  description: "SunaとのAI対話体験",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dancingScript.variable} antialiased`}
      >
        <AuthProvider>
          <ThemeProvider>
            {/* 全ページで管理者ボタンを表示 */}
            <ForceAdminButton />
            
            {/* 緊急用：直接HTMLで管理者ボタンを表示 */}
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
              onClick={() => window.location.href = '/admin'}
            >
              🚨 管理者サイト 🚨
            </div>
            
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
