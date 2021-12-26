from pynput import keyboard
import paho.mqtt.client as mqtt
import json
import yaml

configs = {}
TOPIC_CONTROL = "topic/control"
with open('config.yml') as f:
    configs = yaml.load(f, Loader=yaml.FullLoader)
control_topic = configs.get("topic_control", TOPIC_CONTROL)


def on_press(key):
    msg = ""
    if key == keyboard.Key.up:
        msg = json.dumps(
            {"command": "move", "metadata": {"x": 0, "y": 1}})
        client.publish(control_topic, msg)
    elif key == keyboard.Key.down:
        msg = json.dumps(
            {"command": "move", "metadata": {"x": 0, "y": -1}})
        client.publish(control_topic, msg)
    elif key == keyboard.Key.left:
        msg = json.dumps(
            {"command": "move", "metadata": {"x": -1, "y": 0}})
        client.publish(control_topic, msg)
    elif key == keyboard.Key.right:
        msg = json.dumps(
            {"command": "move", "metadata": {"x": 1, "y": 0}})
        client.publish(control_topic, msg)
    elif str(key) == "'i'":
        msg = json.dumps(
            {"command": "arm_in", "metadata": {}})
        client.publish(control_topic, msg)
    elif str(key) == "'o'":
        msg = json.dumps(
            {"command": "arm_out", "metadata": {}})
        client.publish(control_topic, msg)
    elif str(key) == "'g'":
        msg = json.dumps(
            {"command": "arm_grab", "metadata": {}})
        client.publish(control_topic, msg)
    elif str(key) == "'r'":
        msg = json.dumps(
            {"command": "arm_reset_position", "metadata": {}})
        client.publish(control_topic, msg)
    elif str(key) == "'s'":
        msg = json.dumps(
            {"command": "arm_set_position", "metadata": {}})
        client.publish(control_topic, msg)


def on_release(key):
    if key == keyboard.Key.up or key == keyboard.Key.down or key == keyboard.Key.left or key == keyboard.Key.right:
        print(f'{key} release')
        msg = json.dumps({"command": "stop", "metadata": {}})
        client.publish(control_topic, msg)
    elif str(key) == "'i'" or str(key) == "'o'":
        print(f'{key} release')
        msg = json.dumps({"command": "arm_stop", "metadata": {}})
        client.publish(control_topic, msg)
    elif key == keyboard.Key.esc:
        # Stop listener
        msg = json.dumps({"command": "stop", "metadata": {}})
        client.publish(control_topic, msg)
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
