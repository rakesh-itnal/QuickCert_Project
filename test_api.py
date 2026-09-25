import json
import urllib.request

url = "http://127.0.0.1:8001/api/generate-overlay"
payload = {
    "blueprint": {
        "template_id": "test_123",
        "source_image_url": "test.png",
        "image_width": 1000,
        "image_height": 1000,
        "fields": [
            {
                "id": "f1",
                "label": "Test Field",
                "type": "box",
                "bbox": [100, 100, 200, 200],
                "mapping_column": "name",
                "manual_text": ""
            }
        ]
    },
    "record_index": 0,
    "debug_guides": False,
    "include_background": False
}

req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req) as res:
    print(res.read().decode())
