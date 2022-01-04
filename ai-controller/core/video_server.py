from time import sleep
import cv2
import io
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import threading


class FrameBuffer:
    def __init__(self):
        # store each frame
        self.frame = None
        # buffer to hold incoming frame
        self.buffer = io.BytesIO()

    def write(self, buf):
        # if it's a JPEG image
        if buf.startswith(b'\xff\xd8'):
            # write to buffer
            self.buffer.seek(0)
            self.buffer.write(buf)
            # extract frame
            self.buffer.truncate()
            self.frame = self.buffer.getvalue()


class MJPEGServer(BaseHTTPRequestHandler):
    """
    A simple mjpeg server that either publishes images directly from a camera
    or republishes images from another pygecko process.
    """

    def do_GET(self):
        if not MJPEGServer.frame_buffer:
            print("No framebuffer found!")
            self.send_response(404)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write('<html><head></head><body>'.encode('utf-8'))
            self.wfile.write('<h1>{0!s} not found</h1>'.format(self.path).encode('utf-8'))
            self.wfile.write('</body></html>'.encode('utf-8'))
            return

        if self.path == '/mjpeg':
            self.send_response(200)
            self.send_header('Age', 0)
            self.send_header('Cache-Control', 'no-cache, private')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Content-Type', 'multipart/x-mixed-replace; boundary=FRAME')
            self.end_headers()

            while True:
                frame = MJPEGServer.frame_buffer.frame
                self.wfile.write(b'--FRAME\r\n')
                self.send_header('Content-Type', 'image/jpeg')
                self.send_header('Content-Length', len(frame))
                self.end_headers()
                self.wfile.write(frame)
                self.wfile.write(b'\r\n')
                sleep(0.1)

        else:
            print('error', self.path)
            self.send_response(404)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write('<html><head></head><body>'.encode('utf-8'))
            self.wfile.write('<h1>{0!s} not found</h1>'.format(self.path).encode('utf-8'))
            self.wfile.write('</body></html>'.encode('utf-8'))

def run_mjpeg_server():
    frame_buffer = FrameBuffer()
    MJPEGServer.frame_buffer = frame_buffer

    def runner():
        address = ('', 9000)
        httpd = ThreadingHTTPServer(address, MJPEGServer)
        httpd.serve_forever()

    thread = threading.Thread(target=runner)
    thread.daemon = True
    thread.start()

    return frame_buffer
