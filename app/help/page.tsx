'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const HelpPage = () => {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('getting-started');

  const handleBack = () => {
    router.back();
  };

  const sections = [
    {
      id: 'getting-started',
      title: '始め方',
      icon: '🚀',
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Sunaの始め方</h3>
          <div className="space-y-3">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">1. アカウント作成</h4>
              <p className="text-blue-800">メールアドレスとパスワードを使ってアカウントを作成します。</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">2. ログイン</h4>
              <p className="text-green-800">作成したアカウントでログインして、AIチャットを開始できます。</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">3. チャット開始</h4>
              <p className="text-purple-800">メッセージ入力欄に質問や相談内容を入力して、AIと会話を始めましょう。</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'features',
      title: '主な機能',
      icon: '⚡',
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Sunaでできること</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">💬 AI チャット</h4>
              <p className="text-gray-700">高性能なAIと自然な会話ができます。質問、相談、創作活動など様々な用途に対応。</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">📝 チャット履歴</h4>
              <p className="text-gray-700">過去の会話を保存し、後から参照できます。重要な情報を見失うことがありません。</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">👤 プロフィール管理</h4>
              <p className="text-gray-700">ユーザー情報の編集や利用統計の確認ができます。</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">⚙️ カスタマイズ</h4>
              <p className="text-gray-700">テーマ設定、通知設定など、お好みに合わせてアプリをカスタマイズできます。</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'faq',
      title: 'よくある質問',
      icon: '❓',
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">よくある質問と回答</h3>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-medium mb-2">Q: Sunaは無料で使えますか？</h4>
              <p className="text-gray-700">A: はい、基本機能は無料でご利用いただけます。</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-medium mb-2">Q: チャット履歴はどのくらい保存されますか？</h4>
              <p className="text-gray-700">A: アカウントに紐づいてチャット履歴が保存され、削除するまで保持されます。</p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-medium mb-2">Q: パスワードを忘れた場合はどうすればよいですか？</h4>
              <p className="text-gray-700">A: 現在はパスワードリセット機能を準備中です。お困りの際はサポートまでご連絡ください。</p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4">
              <h4 className="font-medium mb-2">Q: AIはどのような質問に答えられますか？</h4>
              <p className="text-gray-700">A: 一般的な質問、学習サポート、創作活動、プログラミング、日常相談など幅広いトピックに対応しています。</p>
            </div>
            <div className="border-l-4 border-red-500 pl-4">
              <h4 className="font-medium mb-2">Q: データのプライバシーは保護されますか？</h4>
              <p className="text-gray-700">A: はい、ユーザーデータは暗号化され、安全に管理されています。第三者への共有は行いません。</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'tips',
      title: '使い方のコツ',
      icon: '💡',
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">効果的な使い方</h3>
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
              <h4 className="font-medium text-yellow-900 mb-2">💡 具体的な質問をする</h4>
              <p className="text-yellow-800">「教えて」ではなく「〇〇について△△の観点から説明して」のように具体的に質問すると、より有用な回答が得られます。</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <h4 className="font-medium text-blue-900 mb-2">🎯 目的を明確にする</h4>
              <p className="text-blue-800">「初心者向けに」「プロフェッショナルレベルで」など、回答のレベルや用途を指定すると適切な内容が得られます。</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
              <h4 className="font-medium text-green-900 mb-2">🔄 会話を継続する</h4>
              <p className="text-green-800">「もう少し詳しく」「例を教えて」など、フォローアップの質問で理解を深めることができます。</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-400">
              <h4 className="font-medium text-purple-900 mb-2">📚 学習に活用する</h4>
              <p className="text-purple-800">新しい概念の説明、練習問題の作成、学習計画の立案など、学習サポートとしても活用できます。</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'contact',
      title: 'お問い合わせ',
      icon: '📞',
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">サポート・お問い合わせ</h3>
          <div className="space-y-4">
            <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <h4 className="font-medium mb-3">🚀 Sunaについて</h4>
              <p className="text-gray-700 mb-4">Sunaは「新しいAIアシスタントとの対話体験」をコンセプトとした、直感的で使いやすいAIチャットプラットフォームです。</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded">
                  <h5 className="font-medium text-blue-600 mb-1">開発チーム</h5>
                  <p className="text-sm text-gray-600">AI技術とUX設計の専門家</p>
                </div>
                <div className="p-3 bg-white rounded">
                  <h5 className="font-medium text-purple-600 mb-1">ミッション</h5>
                  <p className="text-sm text-gray-600">誰もが気軽にAIを活用できる世界</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">📧 技術的なお問い合わせ</h4>
              <p className="text-gray-700">システムの不具合やご要望については、開発チームまでご連絡ください。</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">💬 フィードバック</h4>
              <p className="text-gray-700">Sunaの改善のため、ご意見やご提案をお聞かせください。皆様の声がサービス向上の原動力です。</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="flex items-center mb-8">
          <button
            onClick={handleBack}
            className="mr-4 p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ヘルプセンター</h1>
            <p className="text-gray-600 mt-1">Sunaの使い方とよくある質問</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* サイドバー */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-6">
              <h3 className="font-semibold text-gray-900 mb-4">目次</h3>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center space-x-2 ${
                      activeSection === section.id
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span>{section.icon}</span>
                    <span>{section.title}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* メインコンテンツ */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-8">
              {sections.find(section => section.id === activeSection)?.content}
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="mt-12 text-center text-gray-500">
          <p className="mb-2">🌟 Suna - AIアシスタントとの新しい対話体験</p>
          <p className="text-sm">さらにご質問がある場合は、チャットでAIアシスタントにお気軽にお尋ねください。</p>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;