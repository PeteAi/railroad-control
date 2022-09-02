import subprocess
import time
from subprocess import check_output
import yaml
import asyncio
import websockets
import json
services = {}
w_socket = None
initialized = asyncio.Event()
class Service:
    def __init__(self, name):
        self.name = name
        self.last_status = self.get_status()
    def __str__(self):
        return f"<Service Object> {self.name}"
    def get_status(self):
        try:
            print(check_output(["sudo", "systemctl", "status", self.name]).decode("utf_8").split('\n'))
            return True
        except subprocess.CalledProcessError as e:
            if str(e) != f"Command '['sudo', 'systemctl', 'status', '{self.name}']' returned non-zero exit status 3.":
                print(e)
            return False
    def monitor_update(self):
        t_status = self.get_status()
        print(t_status)
        if t_status != self.last_status:
            self.last_status = t_status
            return t_status
    def start_service(self):
        check_output(["sudo", "systemctl", "start", self.name]).decode("utf_8").split('\n')
        print(f"{self.name} started")
    def stop_service(self):
        check_output(["sudo", "systemctl", "stop", self.name]).decode("utf_8").split('\n')
        print(f"{self.name} stopped")

with open('setup.yaml', 'r') as f:
    try:
        services = {i: Service(i) for i in yaml.safe_load(f)['services']}
        f.close()
    except yaml.YAMLError as e:
        print(e)


for service in services.keys():
    services[service].start_service()

for service in services.keys():
    print(f"Service: {services[service].name} Status:{services[service].get_status()}")

async def handle_msg(websocket):
    global w_socket
    print("msg")
    w_socket = websocket
    initialized.set()
    while True:
        try:
            msg = await websocket.recv()
        except websockets.exceptions.ConnectionClosed:
            print("Client disconnected")
            break
        if msg == "New Client":
            task_msg = {
                "task": "replace all services",
                "services": [services[i].name for i in services.keys()],
                "status": [services[i].last_status for i in services.keys()]
            }
            await websocket.send(json.dumps(task_msg))

        if msg.split()[0] == "start":
            services[msg.split()[1]].start_service()

        if msg.split()[0] == "stop":
            services[msg.split()[1]].stop_service()


async def main():
    async with websockets.serve(handle_msg, "moba.local", 8081):
        await asyncio.Future()


async def monitor_services():
    print("Monitor Services")
    await initialized.wait()
    while True:
        for service_name in services.keys():
            if (n:= services[service_name].monitor_update()) is not None:
                msg = {
                    "task": "service state update",
                    "service": service_name,
                    "status": n
                }
                await w_socket.send(json.dumps(msg))
        await asyncio.sleep(2)

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    future = loop.create_task(main())
    loop.run_until_complete(monitor_services())
