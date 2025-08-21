import asyncio
import json
from contextlib import AsyncExitStack
from typing import Any, Dict, List, Optional
# import nest_asyncio

from dotenv import load_dotenv
from mcp import ClientSession
from mcp.client.sse import sse_client 
from openai import AsyncOpenAI
import os
# # Apply nest_asyncio to allow nested event loops (needed for Jupyter/IPython)
# nest_asyncio.apply()

# Load environment variables
load_dotenv("../.env")


class MCPClientAZChatBot:
    """Client for interacting with OpenAI models using MCP tools."""

    def __init__(self, model: str = "gpt-4o"):
        """Initialize the OpenAI MCP client.

        Args:
            model: The OpenAI model to use.
        """
        load_dotenv()
        API_KEY = os.getenv("OPENAI_API_KEY")
        self.session: Optional[ClientSession] = None
        self.exit_stack = AsyncExitStack()
        self.openai_client = AsyncOpenAI()

        self.GPT_MODEL = "gpt-4.1-2025-04-14"
        self.TEMPERATURE = 0.0
        self.MAX_TOKENS = 10000

        self.stdio: Optional[Any] = None
        self.write: Optional[Any] = None

    async def connect_to_server(self, server_url: str = "http://localhost:8050/sse"):
        """Connect to an MCP server using SSE.

        Args:
            server_url: URL of the SSE MCP server.
        """

        # Connect to the server using SSE
        sse_transport = await self.exit_stack.enter_async_context(sse_client(server_url))
        self.stdio, self.write = sse_transport

        # Start MCP session
        self.session = await self.exit_stack.enter_async_context(
            ClientSession(self.stdio, self.write)
        )

        await self.session.initialize()

        # List tools
        tools_result = await self.session.list_tools()
        print("\nConnected to server with tools:")
        for tool in tools_result.tools:
            print(f"  - {tool.name}: {tool.description}")

    async def get_mcp_tools(self) -> List[Dict[str, Any]]:
        """Get available tools from the MCP server in OpenAI format.

        Returns:
            A list of tools in OpenAI format.
        """
        tools_result = await self.session.list_tools()
        return [
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.inputSchema,
                },
            }
            for tool in tools_result.tools
        ]

    async def process_query(self, query: str) -> str:
        """Process a query using OpenAI and available MCP tools.

        Args:
            query: The user query.

        Returns:
            The response from OpenAI.
        """
        # Get available tools
        tools = await self.get_mcp_tools()
        system_prompt = "You are a helpful assistant that can use tools to answer questions in Azerbaijani language." \

        # Initial OpenAI API call
        response = await self.openai_client.chat.completions.create(
            model=self.GPT_MODEL,
            temperature=self.TEMPERATURE,
            max_tokens=self.MAX_TOKENS,
            messages=[{"role": "system", "content": system_prompt},
                      {"role": "user", "content": query}],
            tools=tools,
            tool_choice="auto"
        )


        # Get assistant's response
        assistant_message = response.choices[0].message

        # Initialize conversation with user query and assistant response
        messages = [
            {"role": "user", "content": query},
            assistant_message,
        ]

        # Handle tool calls if present
        if assistant_message.tool_calls:
            # Process each tool call
            for tool_call in assistant_message.tool_calls:
                # Execute tool call
                result = await self.session.call_tool(
                    tool_call.function.name,
                    arguments=json.loads(tool_call.function.arguments),
                )

                # Add tool response to conversation
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": result.content[0].text,
                    }
                )

            # Get final response from OpenAI with tool results
            final_response = await self.openai_client.chat.completions.create(
                model=self.GPT_MODEL,
                messages=messages,
                tools=tools,
                tool_choice="none",  # Don't allow more tool calls
            )

            return final_response.choices[0].message.content

        # No tool calls, just return the direct response
        return assistant_message.content

    async def cleanup(self):
        """Clean up resources."""
        await self.exit_stack.aclose()



async def main():
    """Main entry point for the client."""
    client = MCPClientAZChatBot()
    # await client.connect_to_server("server.py")
    await client.connect_to_server()

    query = "Salam, menim adim Alidir, menim balansımda neqeder pul oldugunu oyrenmek isteyirem."
    print(f"\nQuery: {query}")

    try:
        response = await client.process_query(query)
        print(f"\nResponse: {response}")
    finally:
        await client.cleanup()


if __name__ == "__main__":
    asyncio.run(main())