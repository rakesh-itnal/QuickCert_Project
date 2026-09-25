import sys
import traceback

try:
    from main import process_certificate
    import json
    with open('test_data.json') as f:
        data = json.load(f)
    print("Running process_certificate...")
    process_certificate("../test_certificates/BHAGYASHREE_SHRISHAIL_UTTUR_STUDY_A.pdf", data, "output/final_certificate.png")
    print("Done!")
except Exception as e:
    with open("error.log", "w") as f:
        f.write(traceback.format_exc())
