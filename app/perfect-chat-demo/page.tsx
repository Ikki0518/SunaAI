import PerfectChatUI from '../components/PerfectChatUI';

export default function PerfectChatDemoPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f0f2f5',
      padding: '40px 20px',
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '40px',
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#333',
          marginBottom: '16px',
        }}>
          Perfect Chat UI Demo
        </h1>
        <p style={{
          fontSize: '18px',
          color: '#666',
          maxWidth: '600px',
          margin: '0 auto',
        }}>
          標準的なチャット表示順（新しいメッセージが下）の実装
        </p>
      </div>
      
      <PerfectChatUI />
      
      <div style={{
        maxWidth: '800px',
        margin: '40px auto 0',
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          marginBottom: '16px',
          color: '#333',
        }}>
          実装の特徴
        </h2>
        <ul style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}>
          <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ color: '#007bff', marginRight: '8px' }}>✓</span>
            <span>新しいメッセージは必ず画面の最下部に表示</span>
          </li>
          <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ color: '#007bff', marginRight: '8px' }}>✓</span>
            <span>flex-direction: columnを使用（標準的な表示順）</span>
          </li>
          <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ color: '#007bff', marginRight: '8px' }}>✓</span>
            <span>自動スクロール機能（scrollTop = scrollHeight）</span>
          </li>
          <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ color: '#007bff', marginRight: '8px' }}>✓</span>
            <span>データは配列の末尾に追加（.reverse()は不使用）</span>
          </li>
          <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ color: '#007bff', marginRight: '8px' }}>✓</span>
            <span>CSS-in-JSによる完全な自己完結型スタイリング</span>
          </li>
          <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ color: '#007bff', marginRight: '8px' }}>✓</span>
            <span>TypeScriptによる型安全性</span>
          </li>
        </ul>
      </div>
    </div>
  );
}