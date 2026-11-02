/**
 * Firebase Admin SDK Konfigürasyonu
 * ====================================
 * Firebase Cloud Messaging (FCM) için Admin SDK kurulumu.
 * .env dosyasından servis hesabı bilgilerini okur.
 */

let admin = null;
let isInitialized = false;

try {
  admin = require('firebase-admin');

  // Servis hesabı bilgileri .env'den
  const projectId    = process.env.FIREBASE_PROJECT_ID;
  const privateKey   = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail  = process.env.FIREBASE_CLIENT_EMAIL;

  if (projectId && privateKey && clientEmail) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        privateKey,
        clientEmail,
      }),
    });
    isInitialized = true;
    console.log('✅ Firebase Admin SDK başlatıldı');
  } else {
    console.warn('⚠️  Firebase bilgileri eksik - FCM bildirimleri devre dışı');
  }
} catch (err) {
  console.warn('⚠️  Firebase Admin SDK yüklenemedi:', err.message);
}

/**
 * Tek bir kullanıcıya FCM bildirimi gönder
 * @param {string} token - FCM token
 * @param {string} title - Başlık
 * @param {string} body - İçerik
 * @param {object} data - Ek veri (opsiyonel)
 * @returns {Promise<string|null>} Message ID veya null
 */
async function sendNotification(token, title, body, data = {}) {
  if (!isInitialized || !token) return null;

  try {
    const message = {
      token,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: {
        priority: 'high',
        notification: { sound: 'default' }
      },
      apns: {
        payload: { aps: { sound: 'default' } }
      }
    };

    const response = await admin.messaging().send(message);
    return response;
  } catch (err) {
    console.error('FCM tekli gönderim hatası:', err.message);
    return null;
  }
}

/**
 * Birden fazla kullanıcıya FCM bildirimi gönder (multicast)
 * @param {string[]} tokens - FCM token listesi
 * @param {string} title - Başlık
 * @param {string} body - İçerik
 * @param {object} data - Ek veri
 * @returns {Promise<object|null>} BatchResponse veya null
 */
async function sendMulticastNotification(tokens, title, body, data = {}) {
  if (!isInitialized || !tokens || tokens.length === 0) return null;

  try {
    // FCM multicast max 500 token kabul eder, parçala
    const chunks = [];
    for (let i = 0; i < tokens.length; i += 500) {
      chunks.push(tokens.slice(i, i + 500));
    }

    const results = [];
    for (const chunk of chunks) {
      const message = {
        tokens: chunk,
        notification: { title, body },
        data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)])
        ),
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } }
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      results.push(response);
    }

    return results;
  } catch (err) {
    console.error('FCM multicast gönderim hatası:', err.message);
    return null;
  }
}

module.exports = { sendNotification, sendMulticastNotification };
