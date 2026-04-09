const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "I.S.-1 Messenger",
    icon: path.join(__current_dir, 'icon.ico'), // если есть иконка
    webPreferences: {
      nodeIntegration: true
    }
  });

  win.loadFile('index.html'); // Загружаем наш интерфейс
  win.setMenuBarVisibility(false); // Убираем верхнее меню как в Телеге
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
