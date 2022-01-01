import cv2
import queue
import threading
from core.instructions import *
from core.yolov5 import yolov5

class DetectionConfig(object):
    """
    The configuration for the detection feature of the system.
    """

    def __init__(self, image_url: str, failed_detection_threshold: int, bottom_blackout_height: int):
        self.image_url = image_url
        self.failed_detection_threshold = failed_detection_threshold
        self.bottom_blackout_height = bottom_blackout_height

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

    def __init__(self, failed_detection_threshold: int) -> None:
        self.failed_detection_threshold = failed_detection_threshold
        self.initialize()


    def initialize(self):
        self.failed_detections = 0
        self.is_roaming = True

    def get_distance(self, box, frame_width):
        xmin, xmax = int(box['xmin']), int(box['xmax'])

        box_center_bottom_x = xmin + (xmax - xmin) // 2
        distance = frame_width // 2 - box_center_bottom_x
        return distance

    def get_instruction_from_distance(self, distance):
        if distance > 10:
            return TurnLeftInstruction(distance)

        elif distance < -10:
            return TurnRightInstruction(distance)

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
        frame_width, height, boxes = yolov5(frame)
        frame = self.draw_labels(boxes, frame_width, height, frame)

        instruction = None

        if self.is_roaming and len(boxes) == 1:
            self.is_roaming = False
            instruction = StopRoamingInstruction()

        elif not self.is_roaming and len(boxes) == 1:
            distance = self.get_distance(boxes[0], frame_width)
            instruction = self.get_instruction_from_distance(distance)

        elif self.failed_detections >= self.failed_detection_threshold:
            self.failed_detections = 0
            self.is_roaming = True
            instruction = StartRoamingInstruction()

        elif not self.is_roaming and len(boxes) != 1:
            self.failed_detections += 1

        return (instruction, frame)
