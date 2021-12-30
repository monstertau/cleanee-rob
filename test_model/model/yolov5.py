import torch
import os
import logging
from PIL import Image

yolo_model = 'yolov5s'

logging.info(f"YOLO model - {yolo_model}")

model = torch.hub.load("ultralytics/yolov5", 'custom', path='last_plastic_botte.pt')


def yolov5(img):
    """Process a PIL image."""

    # Inference
    model.conf = 0.7  # confidence threshold (0-1)
    model.iou = 0.45  # NMS IoU threshold (0-1)

    results = model(img, size=416)
    names = results.names

    bbs = []
    height, width, channels = img.shape
    if results.xyxy is not None:
        res = results.xyxy[0]
        if len(res) > 0:
            xmin, ymin, xmax, ymax, conf = res[0][0].item(), res[0][1].item(), res[0][2].item(), res[0][3].item(), \
                                           res[0][4].item()
            bb = {'xmin': round(xmin, 2), 'ymin': round(ymin, 2), 'xmax': round(xmax, 2),
                  'ymax': round(ymax, 2), 'conf': round(conf, 2), 'prediction': names[int(res[0][5].item())]}
            bbs.append(bb)

    return width, height, bbs
