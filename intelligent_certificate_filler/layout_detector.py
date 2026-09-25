import cv2
import numpy as np

def detect_layout(gray_image):
    """
    Detects bounds/boxes and structures like text baselines and tables via OpenCV morphology and contour detection.
    """
    # Thresholding the image to binary image
    # Note: we use THRESH_BINARY_INV so lines are white and background is black
    thresh = cv2.adaptiveThreshold(gray_image, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                   cv2.THRESH_BINARY_INV, 11, 2)
    
    # 1. Detect Horizontal and Vertical Lines
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
    
    detect_horizontal = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
    detect_vertical = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, vertical_kernel, iterations=2)
    
    # Combine horizontal and vertical lines
    table_mask = cv2.addWeighted(detect_horizontal, 0.5, detect_vertical, 0.5, 0.0)
    _, table_mask = cv2.threshold(table_mask, 50, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
    
    # Dilate the lines to connect broken lines
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    table_mask = cv2.dilate(table_mask, kernel, iterations=1)
    
    # Find contours for boxes/cells
    contours, hierarchy = cv2.findContours(table_mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    
    bounding_boxes = []
    
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        # Filter out boxes that are either too small or the entire page
        if (w > 20 and h > 10) and (w < gray_image.shape[1] * 0.95 and h < gray_image.shape[0] * 0.95):
            bounding_boxes.append((x, y, w, h))
            
    # Remove duplicates and contained boxes by sorting
    bounding_boxes = sorted(bounding_boxes, key=lambda b: (b[1], b[0]))
    
    # Text line baseline detection (for blank areas that have underlines instead of boxes)
    lines = cv2.HoughLinesP(detect_horizontal, 1, np.pi/180, threshold=100, minLineLength=50, maxLineGap=10)
    underlines = []
    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]
            # Verify horizontal
            if abs(y1 - y2) < 5:
                # Store roughly the area above the underline as a "box" where value could go
                underlines.append((min(x1, x2), max(0, y1 - 30), abs(x2 - x1), 30, y1)) # y1 is the true baseline height
                
    return bounding_boxes, underlines
