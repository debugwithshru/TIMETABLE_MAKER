import urllib.request
import base64

url = 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/unhinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf'
print('Downloading font...')
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as response:
    ttf_data = response.read()

b64 = base64.b64encode(ttf_data).decode('utf-8')
with open('hindiFont.js', 'w') as f:
    f.write(f'window.hindiFontBase64 = "{b64}";\n')

print('Font saved to hindiFont.js')
