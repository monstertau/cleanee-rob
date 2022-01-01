import enum
import cv2
import numpy as np
import argparse
import urllib.request
import imutils
import requests
import socket
import threading
import queue
from model.yolov5 import yolov5
from robot_handler import RobotHandler

URL = "http://192.168.10.242:8080/mjpeg"
HOST = "localhost"
PORT = 1883
KEEPALIVE = 60
TOPIC_CONTROL = "topic/control"
TOPIC_RESPONSE = "topic/robot_response"

# bufferless VideoCapture
class VideoCapture:

  def __init__(self, name):
    self.cap = cv2.VideoCapture(name)
    self.q = queue.Queue()
    t = threading.Thread(target=self._reader)
    t.daemon = True
    t.start()

  # read frames as soon as they are available, keeping only most recent one
  def _reader(self):
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



class Command(enum.Enum):
    INIT = 0
    MOVE_STRAIGHT_NON_OBJ = 1
    TURN_LEFT_NON_OBJ = 2
    TURN_RIGHT_NON_OBJ = 3
    PICK_UP_OBJ = 5


class CameraDetection:
    def __init__(self, handler_serv: RobotHandler, source):
        self.handler_service = handler_serv
        self.source = source
        self.last_command = Command.INIT

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

    def check_distance(self, boxes, width, height):
        if len(boxes) == 0:
            self.fire(has_obj=False)
            return
        for i in range(len(boxes)):
            xmin, ymin, xmax, ymax, conf, label = boxes[i]['xmin'], boxes[i]['ymin'], boxes[i]['xmax'], \
                                                  boxes[i]['ymax'], boxes[i]['conf'], boxes[i]['prediction']
            xmin = int(xmin)
            ymin = int(ymin)
            xmax = int(xmax)
            ymax = int(ymax)
            box_center_bottom_x = xmin + (xmax - xmin) // 2
            distance = width // 2 - box_center_bottom_x
            self.fire(distance, has_obj=True)
        return

    def fire(self, distance=0, has_obj=False):
        if has_obj is False:
            if self.last_command == Command.INIT:
                self.handler_service.publish_control_message("sample_move_straight_2m")
                self.last_command = Command.MOVE_STRAIGHT_NON_OBJ

            elif self.last_command == Command.MOVE_STRAIGHT_NON_OBJ:
                self.handler_service.publish_control_message("turn_left_45_degree")
                self.last_command = Command.TURN_LEFT_NON_OBJ

            elif self.last_command == Command.TURN_LEFT_NON_OBJ:
                self.handler_service.publish_control_message("turn_right_90_degree")
                self.last_command = Command.TURN_RIGHT_NON_OBJ

            elif self.last_command == Command.TURN_RIGHT_NON_OBJ:
                self.handler_service.publish_control_message("turn_left_45_degree")
                self.last_command = Command.INIT

        else:
            ''' Set non-object moving command to init everytime object has detected,
            therefore if object is missing in last time detected, the procedure start from beginning'''
            self.last_command = Command.INIT
            if distance > 100:
                self.handler_service.publish_control_message("turn_left")

            elif distance < -100:
                self.handler_service.publish_control_message("turn_right")

            else:
                self.handler_service.publish_control_message("move_straight")

        # msg = self.get_robot_response()
        # if msg == "object_infront_12cm":
        #     self.handler_service.publish_control_message("pick_up")

    # TODO: timeout if robot is not responding
    def get_robot_response(self):
        while True:
            msg = self.handler_service.get_last_resp_message()
            if msg is not None:
                break
        return msg

    def detect(self):
        cap = VideoCapture(URL)

        while True:
            frame = cap.read()
            frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
            width, height, boxes = yolov5(frame)
            self.check_distance(boxes, width, height)  # send command

            img = self.draw_labels(boxes, width, height, frame)

            cv2.imshow("Image", img)
            key = cv2.waitKey(1)
            if key == 27:
                break

    def start(self):
        self.handler_service.start()
        self.detect()

        self.handler_service.stop()  # stop the client
        cv2.destroyAllWindows()


if __name__ == '__main__':
    client = RobotHandler(HOST, PORT, KEEPALIVE, TOPIC_RESPONSE, TOPIC_CONTROL)
    cam_detection = CameraDetection(client, URL)

    cam_detection.start()

    cv2.destroyAllWindows()
