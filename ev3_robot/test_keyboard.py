from pynput import keyboard
import paho.mqtt.client as mqtt
import json
import yaml

def on_press(key):
    msg = ""
    if key == keyboard.Key.up:
        msg = json.dumps({"type": "car", "command": "move_coord", "metadata": {"x": 0, "y": 1}})
        client.publish("test", msg)
    
    elif key == keyboard.Key.down:
        msg = json.dumps({"type": "car", "command": "move_coord", "metadata": {"x": 0, "y": -1}})
        client.publish("test", msg)
    elif key == keyboard.Key.left:
        msg = json.dumps({"type": "car", "command": "move_coord", "metadata": {"x": -1, "y": 0}})
        client.publish("test", msg)
    elif key == keyboard.Key.right:
        msg = json.dumps({"type": "car", "command": "move_coord", "metadata": {"x": 1, "y": 0}})
        client.publish("test", msg)
    


def on_release(key):
    if key == keyboard.Key.up or key == keyboard.Key.down or key == keyboard.Key.left or key == keyboard.Key.right:
        print(f'{key} release')
        msg = json.dumps({"type": "car", "command": "stop", "metadata": {}})
        client.publish("test", msg)
    if key == keyboard.Key.esc:
        # Stop listener
        msg = json.dumps({"type": "car", "command": "stop", "metadata": {}})
        client.publish("test", msg)
        client.disconnect()
        return False

# ...or, in a non-blocking fashion:
listener = keyboard.Listener(
    on_press=on_press,
    on_release=on_release)
listener.start()
client = mqtt.Client()
client.connect("localhost", 1883, 60)
client.loop_forever()
