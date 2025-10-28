from django.test import TestCase

# Create your tests here.
# create token
"""curl -X POST http://localhost:8000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email":"fongfufu@gmail.com","password":"pakorn1234"}'"""

# use token to get user info
'''TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwidXNlcl9pZCI6MSwiaWF0IjoxNzYxMDI4MDAzLCJleHAiOjE3NjEwMjg5MDMsInR5cGUiOiJhY2Nlc3MifQ.Y7ldVJftE71iQh1egZfqZiGGNj2i97cNuq-f7GoZb9s"
curl -s http://localhost:8000/api/auth/me -H "Authorization: Bearer $TOKEN"'''

# logout
'''curl -s -X POST http://localhost:8000/api/auth/logout -H "Authorization: Bearer $TOKEN"'''

#genai
"""TOKEN="your-JWT"
curl -s -X POST http://localhost:8000/api/ai/gemini/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Give me 3 skincare tips for oily skin."}'
  """