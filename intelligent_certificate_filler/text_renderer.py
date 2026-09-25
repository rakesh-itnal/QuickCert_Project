from PIL import Image, ImageDraw, ImageFont
import cv2
import numpy as np

class TextRenderer:
    def __init__(self, font_path=None):
        """
        Initializes the text renderer. Uses default Arial or default PIL font if none provided.
        """
        self.font_path = font_path

    def get_optimal_font_size(self, text, max_w, max_h, draw):
        """
        Finds the maximum font size that fits into max_w and max_h.
        """
        font_size = 10
        # Iterate to find the best font size
        for size in range(10, 60):
            try:
                if self.font_path:
                    font = ImageFont.truetype(self.font_path, size)
                else:
                    font = ImageFont.load_default()
            except IOError:
                font = ImageFont.load_default()
                return font, 12 # Fallback
                
            # getbbox returns (left, top, right, bottom)
            bbox = draw.textbbox((0, 0), text, font=font)
            w = bbox[2] - bbox[0]
            h = bbox[3] - bbox[1]
            
            if w > max_w or h > max_h:
                font_size = size - 1
                break
            font_size = size
            
        try:
            if self.font_path:
                best_font = ImageFont.truetype(self.font_path, font_size)
            else:
                best_font = ImageFont.load_default()
        except IOError:
            best_font = ImageFont.load_default()
            
        return best_font, font_size

    def overlay_text(self, image_bgr, placements):
        """
        Converts BGR to PIL, draws text smoothly onto it with adaptive sizing, and converts back.
        placements is an array of {'value': str, 'placement_box': (x, y, w, h, true_baseline_or_false)}
        """
        # Convert OpenCV BGR image to PIL Image (RGB)
        img_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(img_rgb)
        draw = ImageDraw.Draw(pil_img)
        
        for p in placements:
            val = p['value']
            box = p['placement_box']
            bx, by, bw, bh, baseline = box
            
            # Apply safety padding
            pad_x = 5
            max_w = bw - (2 * pad_x)
            # Leave some breathing room top and bottom
            max_h = bh - 4
            
            if max_w <= 0 or max_h <= 0:
                continue
                
            # Get Font
            font, size = self.get_optimal_font_size(val, max_w, max_h, draw)
            
            # Get actual text dimensions to perfectly align
            bbox = draw.textbbox((0, 0), val, font=font)
            text_w = bbox[2] - bbox[0]
            text_h = bbox[3] - bbox[1]
            
            # X Placement (Center align slightly left-weighted to look natural)
            # If large box, left align with margin. If small, center.
            if max_w > text_w + 30:
                draw_x = bx + pad_x + 10 # Left align
            else:
                draw_x = bx + pad_x + (max_w - text_w) // 2 # Center align
                
            # Y Placement (Baseline logic)
            if baseline is not False: # It's an underline
                # Place slightly above baseline
                draw_y = baseline - text_h - 4
            else:
                # It's a grid box. Form standard: bottom center, but not touching the line
                # Bottom of the box is by+bh
                draw_y = (by + bh) - text_h - 6
                
            draw.text((draw_x, draw_y), val, font=font, fill=(0, 0, 0)) # Write in black
            
        # Convert back to OpenCv BGR
        final_bgr = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        return final_bgr
