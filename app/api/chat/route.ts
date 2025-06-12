import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, conversationId } = await req.json();

    // Environment variables check
    const apiUrl = process.env.DIFY_API_BASE_URL || process.env.DIFY_API_URL || "https://api.dify.ai/v1";
    const apiKey = process.env.DIFY_API_KEY;
    
    if (process.env.NODE_ENV === 'development') {
      console.log("🐛 [DEBUG] Environment check:", {
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length || 0,
        apiUrl,
        nodeEnv: process.env.NODE_ENV
      });
    }

    if (!apiKey || apiKey.includes('your-actual') || apiKey.includes('実際の')) {
      console.error("🐛 [CRITICAL] DIFY_API_KEY is not properly configured!");
      return NextResponse.json({
        answer: "申し訳ございませんが、現在チャット機能を利用するためのAPI設定が完了していません。\n\n管理者にお問い合わせください。",
        conversationId: conversationId || `demo_${Date.now()}`
      }, { status: 200 });
    }

    console.log("[送信メッセージ]", message);

    // URL validation
    let validApiUrl;
    try {
      validApiUrl = new URL(`${apiUrl}/chat-messages`);
    } catch (error) {
      console.error("🐛 [CRITICAL] Invalid API URL:", apiUrl);
      return NextResponse.json({
        answer: "申し訳ございませんが、API設定に問題があります。管理者にお問い合わせください。",
        conversationId: conversationId || `demo_${Date.now()}`
      }, { status: 200 });
    }

    const response = await fetch(validApiUrl.toString(), {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {},
        query: message,
        response_mode: "blocking",
        user: "user-session", // 固定ユーザーIDで会話継続
        ...(conversationId && { conversation_id: conversationId }),
      }),
    });

    console.log("[Dify応答ステータス]", response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log("[Dify APIエラー]", response.status, errorText);
      
      if (response.status === 404) {
        // Conversation not foundの場合、conversation_idをクリアして新しい会話を開始
        const newResponse = await fetch(`${apiUrl}/chat-messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: {},
            query: message,
            response_mode: "blocking",
            user: "user-session",
            // conversation_idを削除して新しい会話を開始
          }),
        });
        
        const newData = await newResponse.json();
        console.log("[新しい会話開始]", newData);
        
        if (newResponse.ok) {
          return NextResponse.json({
            answer: newData.answer || "応答がありませんでした",
            conversationId: newData.conversation_id,
          });
        }
      }
      
      return NextResponse.json({ answer: "エラーが発生しました" }, { status: 500 });
    }

    const data = await response.json();
    console.log("[Dify応答]", data);

    return NextResponse.json({
      answer: data.answer || "応答がありませんでした",
      conversationId: data.conversation_id,
    });

  } catch (error) {
    console.error("[エラー]", error);
    return NextResponse.json({ answer: "システムエラー" }, { status: 500 });
  }
}