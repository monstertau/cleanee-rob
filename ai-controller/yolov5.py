import torch
import os
import logging
from PIL import Image

yolo_model = 'yolov5s'

logging.info(f"YOLO model - {yolo_model}")

model = torch.hub.load("ultralytics/yolov5", yolo_model, pretrained=True)


def yolov5(img):
    """Process a PIL image."""

    # Inference
    results = model(img)
    rendered_imgs = results.render()
    converted_img = Image.fromarray(rendered_imgs[0]).convert("RGB")

    return results.pred, converted_img