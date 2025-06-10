import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, conversationId } = await req.json();

    const apiUrl = process.env.DIFY_API_BASE_URL || process.env.DIFY_API_URL || "https://api.dify.ai/v1";
    const apiKey = process.env.DIFY_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ answer: "API設定エラー" }, { status: 500 });
    }

    console.log("[送信メッセージ]", message);

    const response = await fetch(`${apiUrl}/chat-messages`, {
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