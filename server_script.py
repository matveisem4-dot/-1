from flask import Flask, request, jsonify

app = Flask(__name__)

# База данных в оперативной памяти (ID -> IP)
users_db = {}

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    user_id = data.get('id')
    user_ip = request.remote_addr # Автоматически берем IP клиента
    
    if user_id:
        users_db[user_id] = user_ip
        print(f"Пользователь {user_id} зарегистрирован с IP {user_ip}")
        return jsonify({"status": "success", "your_ip": user_ip}), 200
    return jsonify({"status": "error"}), 400

@app.route('/get_ip/<target_id>', methods=['GET'])
def get_ip(target_id):
    ip = users_db.get(target_id)
    if ip:
        return jsonify({"id": target_id, "ip": ip}), 200
    return jsonify({"status": "not_found"}), 404

if __name__ == '__main__':
    # GitHub Actions требует, чтобы сервер слушал порт 8080 или 5000
    app.run(host='0.0.0.0', port=8080)
