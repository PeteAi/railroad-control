import pika.frame
import can
import json
from can import Message

amqp_channel = None

pika_console_header = '\u001b[36m[amqp]\033[0m '
can_bus_console_header = '\u001b[33m[can_bus]\033[0m '

can_bus_ok_response = Message(data=[1])
can_bus_init_msg = Message(data=[0, 0])

responses = {}


def on_connected(conn):
    conn.channel(on_open_callback=on_channel_open)
    print(pika_console_header + "connected")

def on_channel_open(new_channel):
    global amqp_channel
    amqp_channel = new_channel
    amqp_channel.queue_declare(queue='python_queue', durable=True, callback=on_queue_declared)
    print(pika_console_header + "queue declared")

def on_queue_declared(frame):
    amqp_channel.basic_consume('python_queue', auto_ack=True, on_message_callback=handle_delivery,
                               callback=print(pika_console_header + "consuming..."))
def on_connection_loss():
    print("[ERROR] amqp connection lost")

def handle_delivery(channel, method, header, body):
    print(pika_console_header + "%r:%r consumed" % (method.routing_key, body))
    msg_json = json.loads(body)
    if msg_json['task'] == 'switch':
        can_bus.send(Message(is_extended_id=False, arbitration_id=msg_json['board_addr'],
                         data=[1, msg_json['board_port'], msg_json['state']]))
        print(can_bus_console_header+f"msg send to {msg_json['board_addr']}")
        responses[msg_json['board_addr']] = msg_json['msg_id']
        return

def handle_can_bus_msg(msg):
    if msg.data == can_bus_ok_response.data:
        print(can_bus_console_header+"\u001b[32mok 200\033[0m")
        res_msg = {"code": "ok 200"}
        if (r := responses[msg.arbitration_id]) is not None:
            res_msg["msg_id"] = r
        amqp_channel.basic_publish('', 'java_queue', str(res_msg))
        return
    if msg.data == can_bus_init_msg.data:
        can_bus.send(can.Message(is_extended_id=False, arbitration_id=msg.arbitration_id))
        print(can_bus_console_header+f"board {msg.arbitration_id} connected")
        return

    # print(can_bus_console_header+msg.data)
    print(msg)


connection = pika.SelectConnection(pika.URLParameters("amqp://admin:admin@moba.local:5672"),
                                   on_open_callback=on_connected,
                                   on_close_callback=None)

can_bus = can.ThreadSafeBus(channel='can0', bustype='socketcan', bitrate=125000)
buffer = can.BufferedReader()
notifier = can.Notifier(can_bus, [buffer, handle_can_bus_msg])
print(can_bus_console_header + 'listening')

try:
    connection.ioloop.start()
except KeyboardInterrupt:
    connection.close()
    connection.ioloop.start()
