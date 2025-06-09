import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, conversationId } = await req.json();

    const res = await fetch(`${process.env.DIFY_API_URL}/chat-messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DIFY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {},
        query: message,
        response_mode: "blocking",
        conversation_id: conversationId || "",
        user: "user-" + Date.now(),
      }),
    });

    const data = await res.json();

    console.log("[DIFY返答]", data);

    return NextResponse.json({
      answer: data.answer || "(no response)",
      conversationId: data.conversation_id || conversationId,
    });
  } catch (error) {
    console.error("[APIエラー]", error);
    return NextResponse.json({ answer: "(サーバーエラーが発生しました)" }, { status: 500 });
  }
}