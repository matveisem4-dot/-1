import sys
import os
import json
import requests
from PyQt6.QtWidgets import QApplication, QMainWindow
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebChannel import QWebChannel
from PyQt6.QtCore import QObject, pyqtSlot, QUrl, QTimer

# СЮДА ВСТАВЬ ССЫЛКУ ИЗ ЛОГОВ GITHUB (которую даст localtunnel)
SERVER_URL = "https://твоя-ссылка.loca.lt" 
MY_ID = "Hacker11" # Придумай свой ID
TARGET_ID = "Друг22" # ID того, кому пишешь

class Bridge(QObject):
    @pyqtSlot(str)
    def send_to_python(self, text):
        # Отправка на GitHub сервер
        try:
            requests.post(f"{SERVER_URL}/reg", json={"id": MY_ID, "msg": text})
        except:
            print("Сервер GitHub упал! Пытаюсь P2P...")

class ShadowGram(QMainWindow):
    def __init__(self):
        super().__init__()
        self.resize(450, 700)
        self.browser = QWebEngineView()
        
        self.channel = QWebChannel()
        self.bridge = Bridge()
        self.channel.registerObject("py_bridge", self.bridge)
        self.browser.page().setWebChannel(self.channel)

        path = os.path.abspath("index.html")
        self.browser.setUrl(QUrl.fromLocalFile(path))
        self.setCentralWidget(self.browser)

        # Таймер для проверки новых сообщений (каждые 3 секунды)
        self.timer = QTimer()
        self.timer.timeout.connect(self.check_messages)
        self.timer.start(3000)

    def check_messages(self):
        # Здесь логика запроса новых сообщений с сервера или P2P
        pass

if __name__ == "__main__":
    app = QApplication(sys.argv)
    # Сохраняем сессию на диск C:
    if not os.path.exists("C:/shadow_session.json"):
        with open("C:/shadow_session.json", "w") as f:
            json.dump({"id": MY_ID}, f)
            
    window = ShadowGram()
    window.show()
    sys.exit(app.exec())
