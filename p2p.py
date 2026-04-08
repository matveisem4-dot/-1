import socket
import threading
import time

class HybridMessenger:
    def __init__(self, server_ip):
        self.server_ip = server_ip
        self.mode = "SERVER" # Начальный режим
        self.is_running = True

    def connect_to_server(self):
        try:
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.sock.connect((self.server_ip, 8080))
            self.mode = "SERVER"
            print("Работаем через GitHub сервер")
        except:
            self.switch_to_p2p()

    def switch_to_p2p(self):
        print("Сервер GitHub перезагружается... Переход на P2P!")
        self.mode = "P2P"
        # Тут запускается логика прямого соединения (например через WebRTC или UDP)
        # Для простоты — ожидание прямого пакета от друга

    def send_data(self, data):
        if self.mode == "SERVER":
            try:
                self.sock.send(data.encode())
            except:
                self.switch_to_p2p()
        else:
            # Логика отправки напрямую на IP друга
            pass

# Запуск
messenger = HybridMessenger("IP_ТВОЕГО_RUNNERA")
messenger.connect_to_server()
