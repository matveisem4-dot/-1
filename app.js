import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, SafeAreaView } from 'react-native';
import database from '@react-native-firebase/database';
import messaging from '@react-native-firebase/messaging';
import { RTCPeerConnection, RTCView, mediaDevices } from 'react-native-webrtc';

// --- Конфигурация WebRTC ---
const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
let peerConnection = new RTCPeerConnection(configuration);

export default function App() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [targetId, setTargetId] = useState('');
  
  const [localStream, setLocalStream] = useState(null);
  const [inCall, setInCall] = useState(false);

  useEffect(() => {
    // Настройка локального медиа для звонков
    mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => setLocalStream(stream))
      .catch(e => console.log("Отсутствует микрофон", e));

    // Наблюдение за состоянием звонка (WebRTC)
    peerConnection.onconnectionstatechange = (e) => {
      // Если центральный сервер упадет на перезагрузку (каждые 4 часа),
      // состояние peerConnection останется 'connected', так как трафик идет P2P!
      console.log("Состояние P2P звонка:", peerConnection.connectionState);
    };
  }, []);

  const registerAndLogin = async () => {
    if (!userId || !password) return alert("Введите ID и пароль");
    
    const fcmToken = await messaging().getToken();
    
    // Отправляем запрос на наш центральный сервер
    database().ref('requests/register').push({
      id: userId,
      password: password,
      email: email,
      fcmToken: fcmToken
    });

    setIsLoggedIn(true);
    listenForMessages(userId);
    listenForCalls(userId);
  };

  const listenForMessages = (myId) => {
    database().ref(`chats/${myId}`).on('child_added', (snapshot) => {
      setMessages(prev => [...prev, snapshot.val()]);
    });
  };

  const sendMessage = () => {
    if (!targetId || !messageText) return;
    
    const msgData = { from: userId, to: targetId, text: messageText, timestamp: Date.now() };
    
    // Мгновенная доставка в чат
    database().ref(`chats/${targetId}`).push(msgData);
    database().ref(`chats/${userId}`).push(msgData);
    
    // Запрос на центральный сервер для отправки Push-уведомления на заблокированный экран
    database().ref('requests/messages').push(msgData);
    
    setMessageText('');
  };

  // --- ЛОГИКА P2P ЗВОНКОВ ---
  const listenForCalls = (myId) => {
    database().ref(`signals/${myId}`).on('child_added', async (snapshot) => {
      const data = snapshot.val();
      if (data.type === 'offer') {
        await peerConnection.setRemoteDescription(data.offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        database().ref(`signals/${data.from}`).push({
          type: 'answer',
          answer: answer,
          from: myId
        });
        setInCall(true);
      } else if (data.type === 'answer') {
        await peerConnection.setRemoteDescription(data.answer);
        setInCall(true);
      }
    });
  };

  const startCall = async () => {
    if (!targetId) return;
    
    if (localStream) {
      localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // Отправляем сигнал (через Firebase, заменяющий туннели)
    database().ref(`signals/${targetId}`).push({
      type: 'offer',
      offer: offer,
      from: userId
    });
  };

  // --- ИНТЕРФЕЙС ("Стиль Telegram Max") ---
  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authBox}>
          <Text style={styles.title}>Вход в Мессенджер</Text>
          <TextInput placeholder="Придумайте ID (без номера телефона)" placeholderTextColor="#687C94" style={styles.input} value={userId} onChangeText={setUserId} />
          <TextInput placeholder="Пароль" placeholderTextColor="#687C94" secureTextEntry style={styles.input} value={password} onChangeText={setPassword} />
          <TextInput placeholder="Email (для 2FA - пропустить, если не нужно)" placeholderTextColor="#687C94" style={styles.input} value={email} onChangeText={setEmail} />
          <TouchableOpacity style={styles.button} onPress={registerAndLogin}>
            <Text style={styles.buttonText}>Войти / Создать</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Мой ID: @{userId}</Text>
        {inCall && <Text style={styles.activeCall}>P2P Звонок Активен 🟢</Text>}
      </View>

      <View style={styles.chatArea}>
        <FlatList 
          data={messages}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({item}) => (
            <View style={[styles.messageBubble, item.from === userId ? styles.myMessage : styles.theirMessage]}>
              <Text style={styles.messageText}>{item.text}</Text>
            </View>
          )}
        />
      </View>

      <View style={styles.inputArea}>
        <TextInput placeholder="ID собеседника" placeholderTextColor="#687C94" style={styles.smallInput} value={targetId} onChangeText={setTargetId} />
        <TextInput placeholder="Сообщение..." placeholderTextColor="#687C94" style={styles.msgInput} value={messageText} onChangeText={setMessageText} />
        
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={styles.btnText}>➤</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.callBtn} onPress={startCall}>
          <Text style={styles.btnText}>📞</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E1621' }, // Тёмный фон в стиле Telegram
  authBox: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#17212B', color: '#FFF', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#242F3D' },
  button: { backgroundColor: '#2B5278', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  
  header: { backgroundColor: '#17212B', padding: 15, borderBottomWidth: 1, borderBottomColor: '#0E1621' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  activeCall: { color: '#4CAF50', fontSize: 14, marginTop: 5 },
  
  chatArea: { flex: 1, padding: 10 },
  messageBubble: { padding: 12, borderRadius: 15, marginBottom: 10, maxWidth: '80%' },
  myMessage: { backgroundColor: '#2B5278', alignSelf: 'flex-end', borderBottomRightRadius: 0 },
  theirMessage: { backgroundColor: '#182533', alignSelf: 'flex-start', borderBottomLeftRadius: 0 },
  messageText: { color: '#FFF', fontSize: 15 },
  
  inputArea: { flexDirection: 'row', padding: 10, backgroundColor: '#17212B', alignItems: 'center' },
  smallInput: { flex: 0.5, backgroundColor: '#242F3D', color: '#FFF', padding: 10, borderRadius: 20, marginRight: 5 },
  msgInput: { flex: 1, backgroundColor: '#242F3D', color: '#FFF', padding: 10, borderRadius: 20, marginRight: 5 },
  sendBtn: { backgroundColor: '#2B5278', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 5 },
  callBtn: { backgroundColor: '#4CAF50', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFF', fontSize: 16 }
});
