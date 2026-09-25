import argparse
import json
import os
import cv2
from PIL import Image

from input_handler import load_and_normalize_input
from preprocessing import preprocess_image
from layout_detector import detect_layout
from ocr_engine import OCREngine
from field_mapper import map_data_to_labels, find_value_regions
from text_renderer import TextRenderer

def process_certificate(input_path, json_data, output_path):
    print(f"Loading and normalizing input: {input_path}")
    image_path = load_and_normalize_input(input_path)
    
    print("Preprocessing image...")
    img_bgr, img_gray = preprocess_image(image_path)
    
    print("Detecting layout structures (grids and baselines)...")
    boxes, underlines = detect_layout(img_gray)
    print(f"Found {len(boxes)} boxes and {len(underlines)} underlines.")
    
    print("Initializing OCR Engine (CPU Mode)...")
    ocr = OCREngine(use_gpu=False)
    
    print("Extracting labels from certificate...")
    labels = ocr.extract_labels(image_path)
    print(f"Extracted {len(labels)} text regions.")
    
    print("Mapping layout fields to JSON data...")
    mapped = map_data_to_labels(json_data, labels)
    
    print(f"Matched {len(mapped)} keys logically from database to certificate fields.")
    placements = find_value_regions(mapped, boxes, underlines)
    
    print("Rendering values onto certificate...")
    renderer = TextRenderer() # Using default font
    final_img_bgr = renderer.overlay_text(img_bgr, placements)
    
    print(f"Saving finalized output to: {output_path}")
    
    # Save as PNG
    cv2.imwrite(output_path, final_img_bgr)
    
    # Optionally save as PDF
    pdf_path = os.path.splitext(output_path)[0] + ".pdf"
    img_rgb = cv2.cvtColor(final_img_bgr, cv2.COLOR_BGR2RGB)
    pil_final = Image.fromarray(img_rgb)
    pil_final.save(pdf_path, "PDF", resolution=300.0)
    print(f"Saved PDF to: {pdf_path}")
    
    return output_path

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Intelligent Certificate Value Filler")
    parser.add_argument("--input", "-i", type=str, help="Path to input certificate (PDF or Image)", required=True)
    parser.add_argument("--data", "-d", type=str, help="Path to JSON data file", required=True)
    parser.add_argument("--output", "-o", type=str, help="Path to output PNG image", default="output/final_certificate.png")
    
    args = parser.parse_args()
    
    # Load JSON
    with open(args.data, 'r') as f:
        data = json.load(f)
        
    os.makedirs(os.path.dirname(args.output) if os.path.dirname(args.output) else '.', exist_ok=True)
    
    process_certificate(args.input, data, args.output)
