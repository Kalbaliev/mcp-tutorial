import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json()

    // Replace this with your actual API endpoint
    // Example: OpenAI, Anthropic, or your custom AI service
    const response = await fetch("http://backend:8000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: message,
      }),
    })

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.json()

    // Adjust this based on your API's response format
    return NextResponse.json({
      message: data.response || data.message || "No response from API",
    })
  } catch (error) {
    console.error("Chat API error:", error)

    const { message } = await request.json()
    return NextResponse.json({
      message: `Echo: ${message} (This is a demo response. Please configure your API endpoint in app/api/chat/route.ts)`,
    })
  }
}
