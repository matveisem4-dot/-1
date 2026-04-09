const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const DB_PATH = 'C:/is1_secure_db.json';
const ENCRYPTION_KEY = process.env.DB_SECRET_KEY || '12345678901234567890123456789012'; // 32 chars
const IV_LENGTH = 16;

// Шифрование данных
function encrypt(text) {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    let parts = text.split(':');
    let iv = Buffer.from(parts.shift(), 'hex');
    let encryptedText = Buffer.from(parts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    return Buffer.concat([decipher.update(encryptedText), decipher.final()]).toString();
}

// Загрузка/Сохранение базы
function loadDB() {
    if (!fs.existsSync(DB_PATH)) return { users: {} };
    try { return JSON.parse(decrypt(fs.readFileSync(DB_PATH, 'utf8'))); }
    catch(e) { return { users: {} }; }
}

function saveDB(db) {
    fs.writeFileSync(DB_PATH, encrypt(JSON.stringify(db)));
}

let activeUsers = {}; // ID -> SocketID

io.on('connection', (socket) => {
    socket.on('auth', async ({ id, password, email }) => {
        let db = loadDB();
        if (!db.users[id]) {
            const hash = await bcrypt.hash(password, 10);
            db.users[id] = { hash, email, twoFA: !!email };
            saveDB(db);
            socket.emit('auth_res', { success: true, msg: "Registered" });
        } else {
            const match = await bcrypt.compare(password, db.users[id].hash);
            if (match) {
                activeUsers[id] = socket.id;
                socket.myId = id;
                socket.emit('auth_res', { success: true, msg: "Logged in" });
            } else {
                socket.emit('auth_res', { success: false, msg: "Wrong password" });
            }
        }
    });

    socket.on('msg', (data) => {
        const target = activeUsers[data.to];
        if (target) io.to(target).emit('msg', { from: socket.myId, text: data.text });
    });

    socket.on('call_signal', (data) => {
        const target = activeUsers[data.to];
        if (target) io.to(target).emit('call_signal', { from: socket.myId, signal: data.signal });
    });

    socket.on('disconnect', () => { delete activeUsers[socket.myId]; });
});

server.listen(3000, () => console.log('I.S.-1 RUNNING ON PORT 3000'));
