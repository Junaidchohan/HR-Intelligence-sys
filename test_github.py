import os
import requests
from dotenv import load_dotenv

def main():
    # 1. Load the existing .env file from the backend directory
    # Adjust this path if the script is run from a different directory
    env_path = os.path.join(os.path.dirname(__file__), 'backend', '.env')
    load_dotenv(env_path)

    # Check if GITHUB_TOKEN is loaded properly
    github_token = os.environ.get('GITHUB_TOKEN')
    
    print("--- Environment Check ---")
    if github_token:
        # Print a masked version of the token for security
        masked_token = f"{github_token[:4]}...{github_token[-4:]}" if len(github_token) > 8 else "***"
        print(f"GITHUB_TOKEN found: {masked_token}")
    else:
        print("GITHUB_TOKEN not found in .env (or .env not found). Falling back to public API rate limits (60 req/hr).")
    
    print("\n--- Making GitHub API Request ---")
    
    username = "junaidchohan"
    url = f"https://api.github.com/users/{username}"
    
    headers = {
        "Accept": "application/vnd.github.v3+json"
    }
    
    if github_token:
        headers["Authorization"] = f"token {github_token}"
        
    try:
        # 2. Make a raw HTTP GET request using requests library
        response = requests.get(url, headers=headers, timeout=10)
        
        # 3. Log the HTTP Status Code and raw JSON response
        print(f"HTTP Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("Response JSON:")
            print(response.text)
        else:
            print("Failed to fetch user. Response:")
            print(response.text)
            
    except requests.exceptions.SSLError as ssl_err:
        # 4. Log specific SSL error
        print(f"SSL Error occurred: {ssl_err}")
    except requests.exceptions.ConnectionError as conn_err:
        # 4. Log specific connection error
        print(f"Connection Error occurred: {conn_err}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    main()
