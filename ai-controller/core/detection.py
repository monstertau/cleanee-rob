import cv2
import queue
import threading
from typing import Tuple
from core.instructions import *
from core.yolov5 import yolov5

class DetectionConfig(object):
    """
    The configuration for the detection feature of the system.
    """

    def __init__(self, image_url: str, failed_detection_threshold: int, bottom_blackout_height: int, start_pickup_vdist: int):
        self.image_url = image_url
        self.failed_detection_threshold = failed_detection_threshold
        self.bottom_blackout_height = bottom_blackout_height
        self.start_pickup_vdist = self.bottom_blackout_height + start_pickup_vdist

class BufferlessVideoCapture:

    def __init__(self, name):
        self.cap = cv2.VideoCapture(name)
        self.q = queue.Queue()
        t = threading.Thread(target=self._reader)
        t.daemon = True
        t.start()

    def _reader(self):
        """
        Read frames from the video capture as soon as they become available. We
        only keep track of the latest frame of the capture.
        """
        while True:
            ret, frame = self.cap.read()
            if not ret:
                break
            if not self.q.empty():
                try:
                    self.q.get_nowait()   # discard previous (unprocessed) frame
                except queue.Empty:
                    pass

            self.q.put(frame)

    def read(self):
        return self.q.get()


class BottleDetector(object):

    def __init__(self, failed_detection_threshold: int, start_pickup_vdist: int) -> None:
        self.failed_detection_threshold = failed_detection_threshold
        self.start_pickup_vdist = start_pickup_vdist
        self.initialize()


    def initialize(self):
        self.failed_detections = 0
        self.is_roaming = True
        self.is_picking_up = False

    def get_distance(self, box, frame_width: int, frame_height: int) -> Tuple[float, float]:
        xmin, xmax, ymax = int(box['xmin']), int(box['xmax']), int(box['ymax'])

        box_center_bottom_x = xmin + (xmax - xmin) // 2
        horizontal_distance = frame_width // 2 - box_center_bottom_x

        vertical_distance = frame_height - ymax

        return (horizontal_distance, vertical_distance)

    def get_instruction_from_distance(self, hdistance, vdistance):
        if vdistance < self.start_pickup_vdist and abs(hdistance) < 10:
            self.is_picking_up = True
            return StartPickupInstruction()

        if hdistance > 10:
            return TurnLeftInstruction(hdistance)

        elif hdistance < -10:
            return TurnRightInstruction(hdistance)

        else:
            return MoveForwardInstruction()

    def draw_labels(self, boxes, width, height, img):
        font = cv2.FONT_HERSHEY_PLAIN
        for i in range(len(boxes)):
            xmin, ymin, xmax, ymax, conf, label = boxes[i]['xmin'], boxes[i]['ymin'], boxes[i]['xmax'], \
                                                  boxes[i]['ymax'], boxes[i]['conf'], boxes[i]['prediction']
            xmin = int(xmin)
            ymin = int(ymin)
            xmax = int(xmax)
            ymax = int(ymax)

            cv2.rectangle(img, (xmin, ymin), (xmax, ymax), (255, 0, 0), 2)
            cv2.putText(img, f"{label} {conf}", (xmin, ymin), font, 1, (255, 0, 0), 1)
            box_center_bottom_x = xmin + (xmax - xmin) // 2
            cv2.line(img, (width // 2, ymax), (width // 2, height), (255, 255, 255), 2, 8)  # bottom image center line
            cv2.line(img, (box_center_bottom_x, ymax), (width // 2, height), (255, 255, 0), 2, 8)  # box center line

            cv2.putText(img, f"bottom right corner distance {width // 2 - box_center_bottom_x} ", (0, height), font, 1,
                        (255, 0, 0), 2)
        return img

    def get_instruction(self, frame):
        if self.is_picking_up:
            return (None, frame)

        frame_width, frame_height, boxes = yolov5(frame)
        frame = self.draw_labels(boxes, frame_width, frame_height, frame)

        instruction = None

        if self.is_roaming and len(boxes) == 1:
            self.is_roaming = False
            instruction = StopRoamingInstruction()

        elif not self.is_roaming and len(boxes) == 1:
            hdistance, vdistance = self.get_distance(boxes[0], frame_width, frame_height)
            instruction = self.get_instruction_from_distance(hdistance, vdistance)

        elif self.failed_detections >= self.failed_detection_threshold:
            self.failed_detections = 0
            self.is_roaming = True
            instruction = StartRoamingInstruction()

        elif not self.is_roaming and len(boxes) != 1:
            self.failed_detections += 1

        return (instruction, frame)
