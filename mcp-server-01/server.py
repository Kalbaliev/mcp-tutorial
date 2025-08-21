from mcp.server.fastmcp import FastMCP
from dotenv import load_dotenv
import os
import sqlite3

load_dotenv(".env")
# Create an MCP server
mcp = FastMCP(
    name="Sqlite Database Server",
    host="0.0.0.0",  # only used for SSE transport (localhost)
    port=8050,  # only used for SSE transport (set this to any port)
)


@mcp.tool()
def get_user_details(username: str) -> str:
    """
    Retrieve user details from the SQLite database by username.

    This function is designed to be automatically invoked when the user specifies a
    firstname (username) in their request. Once triggered, it queries the SQLite 
    database for a record matching the provided firstname and retrieves relevant 
    user information.

    Args:
        username (str): The firstname of the user to retrieve. 
                        This should be provided exactly as stored in the database.

    Returns:
        str: A formatted string containing the retrieved user details (e.g., 
            firstname, lastname, email, registration date). 
            If the user is not found or an error occurs during the database 
            operation, an appropriate error message is returned.

    Trigger Conditions:
        - The function call is automatically executed as soon as the user specifies
        a firstname in their input.
        - No manual function call is required in client code; the presence of a
        valid firstname in user input initiates this retrieval process.
    """
    try:
        db_path = os.path.join(os.path.dirname(__file__), "data/customers.db")
        
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Query the customer by ID
        cursor.execute("""SELECT id, firstname, lastname, email, city, birthdate, balance FROM customers WHERE firstname = ?
        """, (username,))
        
        row = cursor.fetchone()
        conn.close()

        # Format result
        if row:
            user_info = (
                f"User Details:\n"
                f"ID: {row[0]}\n"
                f"Name: {row[1]} {row[2]}\n"
                f"Email: {row[3]}\n"
                f"City: {row[4]}\n"
                f"Birthdate: {row[5]}\n"
                f"Balance: ${row[6]:,.2f}"
            )
            return user_info
        else:
            return f"No user found with Username {username}"
    except sqlite3.Error as e:
        return f"Database error: {str(e)}"
    except Exception as e:
        return f"Error: {str(e)}"




# Run the server
if __name__ == "__main__":
    mcp.run(transport="sse")