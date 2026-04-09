const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Инициализация Firebase (замените на свои ключи)
const serviceAccount = require('./firebase-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://your-project-id.firebaseio.com"
});

const db = admin.database();

// Директория на диске C для хранения локальных логов и бэкапов пользователей
const LOCAL_STORAGE_DIR = 'C:\\messenger_server_data';
const USERS_DB_FILE = path.join(LOCAL_STORAGE_DIR, 'users_backup.json');

// Создаем папку на диске C, если ее нет
if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
    fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
    console.log(`Директория создана: ${LOCAL_STORAGE_DIR}`);
}

// Загрузка локальной базы
let usersCache = {};
if (fs.existsSync(USERS_DB_FILE)) {
    usersCache = JSON.parse(fs.readFileSync(USERS_DB_FILE, 'utf8'));
}

// Слушаем регистрацию новых пользователей
db.ref('requests/register').on('child_added', async (snapshot) => {
    const data = snapshot.val();
    const requestId = snapshot.key;

    if (data.id && data.password) {
        usersCache[data.id] = {
            password: data.password, // В реальном проекте используйте bcrypt!
            email: data.email || null,
            fcmToken: data.fcmToken || null
        };
        
        // Записываем данные на диск C
        fs.writeFileSync(USERS_DB_FILE, JSON.stringify(usersCache, null, 2));
        
        // Подтверждаем регистрацию в облаке
        await db.ref(`users/${data.id}`).set({ publicStatus: 'online' });
        await db.ref(`requests/register/${requestId}`).remove();
        console.log(`Пользователь ${data.id} зарегистрирован и сохранен на C:`);
    }
});

// Слушаем запросы на отправку сообщений (для Push-уведомлений на заблокированный экран)
db.ref('requests/messages').on('child_added', async (snapshot) => {
    const msg = snapshot.val();
    const recipient = usersCache[msg.to];

    if (recipient && recipient.fcmToken) {
        const payload = {
            notification: {
                title: `Сообщение от ${msg.from}`,
                body: msg.text
            },
            token: recipient.fcmToken,
            android: { priority: 'high' } // Пробивает спящий режим и экран блокировки
        };

        try {
            await admin.messaging().send(payload);
            console.log(`Push отправлен пользователю ${msg.to}`);
        } catch (error) {
            console.error('Ошибка отправки Push:', error);
        }
    }
    await db.ref(`requests/messages/${snapshot.key}`).remove();
});

console.log("Сервер мессенджера запущен. Локальная база: ", USERS_DB_FILE);

// Удержание процесса запущенным
setInterval(() => {
    console.log("Worker активен...");
}, 60000);
