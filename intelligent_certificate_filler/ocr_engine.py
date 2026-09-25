import easyocr
import cv2

class OCREngine:
    def __init__(self, languages=['en'], use_gpu=False):
        """
        Initializes EasyOCR.
        By default, use_gpu is False per the user requirements to use CPU only.
        """
        self.reader = easyocr.Reader(languages, gpu=use_gpu)

    def extract_labels(self, image):
        """
        Extracts textual labels and their bounding box coordinates.
        Returns a list of dicts: {'text': string, 'box': [x_min, y_min, x_max, y_max], 'confidence': float}
        """
        # reader.readtext output format: [([[x1,y1], [x2,y2], [x3,y3], [x4,y4]], text, confidence), ...]
        results = self.reader.readtext(image)
        labels = []
        for (bbox, text, prob) in results:
            # bbox is typically a list of 4 points -> top-left, top-right, bottom-right, bottom-left
            p_top_left = bbox[0]
            p_bottom_right = bbox[2]
            
            x_min = int(min(p_top_left[0], bbox[3][0]))
            y_min = int(min(p_top_left[1], bbox[1][1]))
            x_max = int(max(p_bottom_right[0], bbox[1][0]))
            y_max = int(max(p_bottom_right[1], bbox[3][1]))
            
            labels.append({
                'text': text.strip(),
                'box': (x_min, y_min, x_max, y_max),
                'confidence': prob
            })
        return labels
