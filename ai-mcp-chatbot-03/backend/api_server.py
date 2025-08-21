import asyncio
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from client import MCPClientAZChatBot

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_methods=["*"],
    allow_headers=["*"],
)

client = MCPClientAZChatBot()

@app.on_event("startup")
async def startup_event():
    await client.connect_to_server()

@app.post("/chat")
async def chat(request: Request):
    data = await request.json()
    query = data.get("query", "")
    response = await client.process_query(query)
    print(f"\nResponse: {response}")
    return {"response": response}
