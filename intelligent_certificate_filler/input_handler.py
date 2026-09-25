import os
import fitz  # PyMuPDF
from PIL import Image
import numpy as np

def load_and_normalize_input(file_path, output_dir="temp", dpi=300):
    """
    Accepts a PDF or Image, converts PDF to Image to 300 DPI, and returns the path to the normalized image.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    ext = os.path.splitext(file_path)[1].lower()
    img_path = os.path.join(output_dir, "normalized_input.png")
    
    if ext == ".pdf":
        doc = fitz.open(file_path)
        page = doc.load_page(0)  # Only process the first page
        zoom = dpi / 72.0  # 72 is the default DPI in PyMuPDF
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        pix.save(img_path)
        doc.close()
    elif ext in [".png", ".jpg", ".jpeg", ".bmp", ".tiff"]:
        # If it's an image, load it and ensure high DPI
        img = Image.open(file_path)
        # Convert to RGB to standardize
        if img.mode != 'RGB':
            img = img.convert('RGB')
        # We can simulate 300 DPI by just saving it / ensuring decent resolution. 
        # Optionally resize if it's too small, but here we just convert to standardized PNG
        img.save(img_path, optimize=True, dpi=(dpi, dpi))
    else:
        raise ValueError("Unsupported file format. Please provide a PDF or Image file.")
        
    return img_path
