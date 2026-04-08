import socket
import threading

# Простейший ретранслятор (Signaling Server)
def handle_client(client_socket):
    while True:
        try:
            data = client_socket.recv(1024)
            if not data: break
            # Рассылаем данные всем подключенным (упрощенно)
            broadcast(data, client_socket)
        except:
            break

def broadcast(message, current_client):
    for client in clients:
        if client != current_client:
            client.send(message)

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.bind(('0.0.0.0', 8080))
server.listen(10)
clients = []

print("Server is running on GitHub Actions...")
while True:
    conn, addr = server.accept()
    clients.append(conn)
    threading.Thread(target=handle_client, args=(conn,)).start()
