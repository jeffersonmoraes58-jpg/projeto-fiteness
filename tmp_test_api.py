import json, urllib.request
data = json.dumps({"email": "admin@fitsaas.com", "password": "admin"}).encode()
req = urllib.request.Request("http://localhost:4000/api/v1/auth/login", data=data, headers={"Content-Type": "application/json"})
resp = urllib.request.urlopen(req)
print(resp.read().decode())
