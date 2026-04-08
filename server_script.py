from flask import Flask, request, jsonify

app = Flask(__name__)
# База данных: ID -> IP
db = {}

@app.route('/reg', methods=['POST'])
def reg():
    data = request.get_json()
    uid = data.get('id')
    uip = request.remote_addr
    if uid:
        db[uid] = uip
        print(f"User {uid} connected from {uip}")
        return jsonify({"status": "ok", "ip": uip}), 200
    return jsonify({"status": "error"}), 400

@app.route('/get/<target_id>', methods=['GET'])
def get_ip(target_id):
    ip = db.get(target_id)
    return jsonify({"ip": ip}) if ip else (jsonify({"status": "404"}), 404)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
