import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, conversationId } = await req.json();

    // Dify API設定確認
    const apiUrl = process.env.DIFY_API_BASE_URL || process.env.DIFY_API_URL || "https://api.dify.ai/v1";
    const apiKey = process.env.DIFY_API_KEY;

    if (!apiKey) {
      console.error("[設定エラー] DIFY_API_KEYが設定されていません");
      return NextResponse.json({ answer: "(Dify API設定エラー)" }, { status: 500 });
    }

    // Dify APIリクエストボディ
    const requestBody: any = {
      inputs: {},
      query: message,
      response_mode: "blocking",
      user: "user-" + Date.now(),
    };

    // conversation_idがある場合のみ追加（無効な場合は新しい会話を開始）
    if (conversationId && conversationId.trim() !== "") {
      requestBody.conversation_id = conversationId;
    }

    console.log("[Dify API呼び出し]", {
      url: `${apiUrl}/chat-messages`,
      body: requestBody
    });

    const res = await fetch(`${apiUrl}/chat-messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await res.json();

    console.log("[DIFY返答]", data);

    // エラーレスポンスの処理
    if (!res.ok || data.code) {
      console.error("[Dify APIエラー]", data);
      
      // Conversation Not Existsエラーの場合、新しい会話で再試行
      if (data.code === 'not_found' && conversationId) {
        console.log("[再試行] 新しい会話で再送信");
        
        const retryBody = { ...requestBody };
        delete retryBody.conversation_id;
        
        const retryRes = await fetch(`${apiUrl}/chat-messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(retryBody),
        });

        const retryData = await retryRes.json();
        console.log("[再試行結果]", retryData);

        return NextResponse.json({
          answer: retryData.answer || "(no response)",
          conversationId: retryData.conversation_id,
        });
      }

      return NextResponse.json({ 
        answer: "(Dify APIエラーが発生しました)" 
      }, { status: 500 });
    }

    return NextResponse.json({
      answer: data.answer || "(no response)",
      conversationId: data.conversation_id || conversationId,
    });
  } catch (error) {
    console.error("[APIエラー]", error);
    return NextResponse.json({ answer: "(サーバーエラーが発生しました)" }, { status: 500 });
  }
}