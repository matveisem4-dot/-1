const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const io = require('socket.io')(3000, { cors: { origin: "*" } });

const DB_PATH = 'C:/is1_secure_db.json';
const SECRET = process.env.DB_SECRET_KEY || 'default_32_char_secret_key_is1_!!!';

// AES-256 Шифрование
const encrypt = (text) => {
    let iv = crypto.randomBytes(16);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(SECRET), iv);
    return iv.toString('hex') + ':' + Buffer.concat([cipher.update(text), cipher.final()]).toString('hex');
};

const decrypt = (text) => {
    let parts = text.split(':');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(SECRET), Buffer.from(parts.shift(), 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(parts.join(':'), 'hex')), decipher.final()]).toString();
};

// Работа с диском C:
const save = (db) => fs.writeFileSync(DB_PATH, encrypt(JSON.stringify(db)));
const load = () => {
    if (!fs.existsSync(DB_PATH)) return { users: {} };
    return JSON.parse(decrypt(fs.readFileSync(DB_PATH, 'utf8')));
};

io.on('connection', (socket) => {
    socket.on('auth', async ({ id, password, email }) => {
        let db = load();
        if (!db.users[id]) {
            db.users[id] = { hash: await bcrypt.hash(password, 10), email };
            save(db);
        }
        socket.join(id);
        socket.emit('ready');
    });

    socket.on('msg', (d) => io.to(d.to).emit('msg', { from: d.from, text: d.text }));
    socket.on('signal', (d) => io.to(d.to).emit('signal', { from: d.from, signal: d.signal }));
});
