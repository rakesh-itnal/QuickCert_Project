import re

def clean_text(text):
    """ Removes non-alphanumeric chars for looser matching. """
    return re.sub(r'[^a-zA-Z0-9]', '', text).lower()

def map_data_to_labels(json_data, extracted_labels):
    """
    Fuzzy matches JSON keys (e.g., 'father_name') to OCR labels (e.g., 'Father Name:').
    Returns a list of dicts with the mapped label box and the value to print.
    """
    matched_data = []
    
    # Pre-clean keys
    key_map = {clean_text(k): k for k in json_data.keys()}
    
    for label_info in extracted_labels:
        label_text_clean = clean_text(label_info['text'])
        
        # Exact substring or fuzzy correspondence
        best_match_key = None
        for c_key in key_map.keys():
            # If the OCR text contains the JSON key (like 'fathername' inside 'fathersname') or vice versa
            if c_key in label_text_clean or label_text_clean in c_key:
                # Basic protection for tiny words, ensuring semantic match
                if len(c_key) > 2 and len(label_text_clean) > 2:
                    best_match_key = key_map[c_key]
                    break
                    
        # Special hard-coded logic if needed for common abbreviations
        if not best_match_key:
            if 's/o' in label_text_clean or 'd/o' in label_text_clean:
                if 'father_name' in json_data:
                    best_match_key = 'father_name'
                elif 'mother_name' in json_data:
                    best_match_key = 'mother_name'
        
        if best_match_key:
            matched_data.append({
                'label': label_info['text'],
                'label_box': label_info['box'],
                'value': json_data[best_match_key],
                'json_key': best_match_key
            })
            
    return matched_data

def find_value_regions(mapped_data, layout_boxes, underlines):
    """
    For each matched label, finds the most logical bounding box or underline area
    to physically place the value.
    Usually: The box immediately to the right, or the nearest underline on the same y-plane.
    """
    final_placements = []
    
    for item in mapped_data:
        label_x1, label_y1, label_x2, label_y2 = item['label_box']
        label_mid_y = (label_y1 + label_y2) / 2
        
        best_box = None
        min_dist = float('inf')
        
        # 1. Search in bounding boxes (Tables/Grid cells)
        for (bx, by, bw, bh) in layout_boxes:
            bx2 = bx + bw
            by2 = by + bh
            # Check if this box is to the right and roughly on the same vertical line
            if bx > label_x2 and by < label_mid_y < by2:
                dist = bx - label_x2
                if dist < min_dist and dist < 500:  # Prevent mapping entirely across page
                    min_dist = dist
                    best_box = (bx, by, bw, bh, False) # False means not an underline (baseline is by+bh)
                    
        # 2. Search in underlines if no box or underline is closer
        for (ux, uy, uw, uh, true_baseline) in underlines:
            ux2 = ux + uw
            # Underline is to the right or starts near the label_x2
            if ux > label_x2 - 100 and abs((uy + uh) - label_y2) < 30: 
                # Same row, physically near
                dist = max(0, ux - label_x2)
                if dist < min_dist:
                    min_dist = dist
                    best_box = (ux, uy, uw, uh, true_baseline)
                    
        # 3. Default fallback if no physical structural lines detect near it
        # Infer a virtual box immediately to the right
        if not best_box:
            best_box = (label_x2 + 10, label_y1, 200, label_y2 - label_y1, False)
            
        final_placements.append({
            'value': str(item['value']),
            'placement_box': best_box
        })
        
    return final_placements
