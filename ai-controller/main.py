from PIL import Image, ImageTk, ImageDraw
import PySimpleGUI as sg
import requests
from yolov5 import yolov5

IMAGE_URL = "http://192.168.10.242:8080/jpeg"
ASPECT_RATIO = 640 / 480
TARGET_WIDTH = 400
TARGET_HEIGHT = int(TARGET_WIDTH / ASPECT_RATIO)
EVENT_READ_TIMEOUT = 1000 / 30

def update_img(window):
    req = requests.get(IMAGE_URL, stream=True)

    image = Image.open(req.raw).resize((TARGET_WIDTH, TARGET_HEIGHT))
    draw = ImageDraw.Draw(image)

    preds, _ = yolov5(image.convert("RGB"))

    if len(preds) != 1 and preds[0] is not None:
        return

    pred = preds[0]

    if len(pred) != 1:
        return

    print("Updating prediction...")
    for *box, confidence, label in pred:
        draw.rectangle(
            box,
            outline="#00ff00",
            width=2
        )

    window.Element("image").update(data=ImageTk.PhotoImage(image))


def main():
    layout = [
        [sg.Image(key="image")]
    ]

    window = sg.Window("rect on image", layout)
    window.Finalize()

    while True:
        update_img(window)

        event, values = window.read(EVENT_READ_TIMEOUT)
        if event in (sg.WIN_CLOSED, 'Quit'):
            break

    window.close()

if __name__ == "__main__":
    main()
