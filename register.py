import sys
import os
import json
from PyQt6.QtWidgets import QApplication, QMainWindow
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebChannel import QWebChannel
from PyQt6.QtCore import QObject, pyqtSlot, QUrl

# Класс-мост между JS и Python
class Bridge(QObject):
    @pyqtSlot(str)
    def register_user(self, data_json):
        data = json.loads(data_json)
        user_id = data['id']
        password = data['pass']
        
        # Сохраняем сессию на диск C: (Вход один раз)
        # Убедись, что запускаешь от админа, чтобы писать в корень C:
        session_path = "C:/shadow_session.json"
        with open(session_path, "w") as f:
            json.dump(data, f)
            
        print(f"Аккаунт {user_id} создан! Сессия сохранена в {session_path}")
        
        # Если включена 2FA - вызываем функцию отправки кода (которую мы писали ранее)
        if data['use2fa']:
            print(f"Отправка кода на {data['email']}...")
            # send_verification_code(data['email'])

class ShadowGram(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("ShadowGram")
        self.resize(450, 700)

        self.browser = QWebEngineView()
        
        # Настройка канала связи JS -> Python
        self.channel = QWebChannel()
        self.bridge = Bridge()
        self.channel.registerObject("py_bridge", self.bridge)
        self.browser.page().setWebChannel(self.channel)

        # Загрузка интерфейса
        path = os.path.abspath("index.html")
        self.browser.setUrl(QUrl.fromLocalFile(path))
        
        self.setCentralWidget(self.browser)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = ShadowGram()
    window.show()
    sys.exit(app.exec())
