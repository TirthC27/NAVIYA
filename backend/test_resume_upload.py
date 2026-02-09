"""
Test Resume Upload Endpoint
Quick test script to verify resume upload is working
"""

import requests
import os

# Test configuration
BASE_URL = "http://localhost:8000"
TEST_USER_ID = "test-user-123"

def test_upload():
    """Test uploading a sample resume"""
    
    # Create a simple test PDF content (you'll need a real PDF to test)
    # For now, just check if endpoint accepts the request format
    
    url = f"{BASE_URL}/api/resume-simple/upload"
    
    # Test 1: Check endpoint exists
    print("=" * 50)
    print("Testing Resume Upload Endpoint")
    print("=" * 50)
    print(f"Endpoint: {url}")
    print(f"Test User ID: {TEST_USER_ID}")
    print()
    
    # Test 2: Try with missing file (should get 422)
    print("Test 1: Missing file parameter")
    data = {"user_id": TEST_USER_ID}
    response = requests.post(url, data=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json() if response.status_code != 200 else 'OK'}")
    print()
    
    # Test 3: Try with dummy file
    print("Test 2: With sample text file (should fail - not PDF/DOCX)")
    files = {"file": ("test.txt", b"This is a test", "text/plain")}
    data = {"user_id": TEST_USER_ID}
    response = requests.post(url, data=data, files=files)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()
    
    print("=" * 50)
    print("To fully test, upload a real PDF/DOCX resume via the UI")
    print("OR place a resume file in this directory and update this script")
    print("=" * 50)
    
    # Test 4: Get resume data (should be empty or 404)
    print("\nTest 3: Get resume data")
    get_url = f"{BASE_URL}/api/resume-simple/data/{TEST_USER_ID}"
    response = requests.get(get_url)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Resume data: {response.json()}")
    else:
        print(f"No resume found (expected): {response.json()}")

if __name__ == "__main__":
    try:
        test_upload()
    except requests.exceptions.ConnectionError:
        print("❌ Error: Cannot connect to backend server")
        print("Make sure the server is running on http://localhost:8000")
    except Exception as e:
        print(f"❌ Error: {e}")
