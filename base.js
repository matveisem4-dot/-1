const fs = require('fs');
const DB_PATH = 'C:/is1_encrypted_db.json';

async function registerUser(id, password, email) {
    let db = { users: {} };
    if (fs.existsSync(DB_PATH)) {
        db = JSON.parse(decrypt(fs.readFileSync(DB_PATH, 'utf8')));
    }

    // Хэшируем пароль (bcrypt), чтобы даже ты его не знал в чистом виде
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    db.users[id] = { 
        password: hashedPassword, 
        email: email, 
        twoFA: !!email 
    };

    // Шифруем всю базу перед сохранением
    fs.writeFileSync(DB_PATH, encrypt(JSON.stringify(db)));
    return "USER_CREATED_AND_ENCRYPTED";
}
