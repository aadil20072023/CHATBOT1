import { db, auth } from './firebase.js';
import { 
  collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc,
  query, where, onSnapshot, deleteDoc, orderBy
} from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const SESSION_KEY = 'cb_session';

export function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch { return null; }
}

export function saveSession(user) {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

// ── Auth ─────────────────────────────────────────────

export async function register({ name, username, email, password, color, initials }) {
  const usersRef = collection(db, 'users');
  const snap = await getDocs(usersRef);
  const users = snap.docs.map(d => d.data());

  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { error: 'An account with this email already exists.' };
  }
  if (!username) return { error: 'Username is required.' };
  
  const cleanUsername = username.trim().toLowerCase().replace('@', '');
  if (users.find(u => u.username === cleanUsername)) {
    return { error: 'This username is already taken.' };
  }

  const bgs = ['av-green', 'av-blue', 'av-pink', 'av-purple', 'av-indigo', 'av-orange'];
  const randomColor = bgs[Math.floor(Math.random() * bgs.length)];

  const user = {
    id: `u_${Date.now()}`,
    name: name.trim(),
    username: cleanUsername,
    email: email.trim().toLowerCase(),
    password, 
    color: randomColor,
    initials: initials || name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
    about: '👋 Hey there! I am using ChatterBox.',
    createdAt: Date.now(),
    online: true,
  };

  await setDoc(doc(db, 'users', user.id), user);
  return { user };
}

export async function login({ identifier, password }) {
  const usersRef = collection(db, 'users');
  const snap = await getDocs(usersRef);
  const users = snap.docs.map(d => d.data());

  let idLower = identifier.trim().toLowerCase();
  if (idLower.startsWith('@')) idLower = idLower.substring(1);

  const user = users.find(
    u => (u.email.toLowerCase() === idLower || u.username === idLower) && u.password === password
  );
  if (!user) return { error: 'Invalid email/username or password.' };
  
  await setOnlineStatus(user.id, true);
  return { user };
}

export async function loginWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const gUser = result.user; // Firebase Auth user object

    // Check if they exist in our Firestore db
    const usersRef = collection(db, 'users');
    const snap = await getDocs(usersRef);
    const users = snap.docs.map(d => d.data());
    
    let dbUser = users.find(u => u.email.toLowerCase() === gUser.email.toLowerCase());
    
    // If exact match doesn't exist, we don't create it immediately. Hand it back to UI.
    if (!dbUser) {
       return { 
          isNew: true, 
          googleUserData: { email: gUser.email, displayName: gUser.displayName }
       };
    }

    await setOnlineStatus(dbUser.id, true);
    return { user: dbUser };
  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user') return { error: 'Google sign-in was cancelled.' };
    return { error: 'Failed to sign in with Google. Ensure Google Auth is enabled in Firebase Console.' };
  }
}

export async function finishGoogleSignup(googleUserData, chosenUsername) {
    const usersRef = collection(db, 'users');
    const snap = await getDocs(usersRef);
    const users = snap.docs.map(d => d.data());

    const cleanUsername = chosenUsername.trim().toLowerCase().replace('@', '');
    if (users.find(u => u.username === cleanUsername)) {
        return { error: 'This username is already taken.' };
    }

    const bgs = ['av-green', 'av-blue', 'av-pink', 'av-purple', 'av-indigo', 'av-orange'];
    const color = bgs[Math.floor(Math.random() * bgs.length)];
    const initials = googleUserData.displayName?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'XX';
       
    const dbUser = {
         id: `u_${Date.now()}`,
         name: googleUserData.displayName || 'Google User',
         username: cleanUsername,
         email: googleUserData.email.toLowerCase(),
         password: 'google_auth_placeholder',
         color,
         initials,
         about: '👋 Hey there! I joined using Google.',
         createdAt: Date.now(),
         online: true,
    };
    await setDoc(doc(db, 'users', dbUser.id), dbUser);
    return { user: dbUser };
}

export async function logout(userId) {
  if (userId) await setOnlineStatus(userId, false);
  localStorage.removeItem(SESSION_KEY);
}

export async function updateProfile(userId, data) {
  if (data.username) {
    const cleanUsername = data.username.trim().toLowerCase().replace('@', '');
    const usersRef = collection(db, 'users');
    const snap = await getDocs(usersRef);
    const users = snap.docs.map(d => d.data());
    
    if (cleanUsername.length < 3) return { error: 'Username must be at least 3 characters.' };
    
    const existing = users.find(u => u.username === cleanUsername && u.id !== userId);
    if (existing) {
      return { error: 'This username is already taken.' };
    }
    data.username = cleanUsername;
  }

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, data);
  const updated = await getDoc(userRef);
  return { user: updated.data() };
}

export async function setOnlineStatus(userId, online) {
  if (!userId) return;
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { online, lastSeen: Date.now() });
  } catch (e) {}
}

export async function getUserById(id) {
  try {
    const d = await getDoc(doc(db, 'users', id));
    return d.exists() ? d.data() : null;
  } catch (e) { return null; }
}

export async function searchUsers(queryStr, excludeId) {
  if (!queryStr.trim()) return [];
  const snap = await getDocs(collection(db, 'users'));
  const users = snap.docs.map(d => d.data());
  
  let qLower = queryStr.trim().toLowerCase();
  let qUser = qLower;
  if (qLower.startsWith('@')) qUser = qLower.substring(1);

  return users.filter(
    u => u.id !== excludeId &&
    (u.email.toLowerCase() === qLower || (u.username && u.username === qUser))
  );
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => d.data()).sort((a,b) => b.createdAt - a.createdAt);
}

// ── Conversations ─────────────────────────────────────

export function getConvId(a, b) {
  return [a, b].sort().join('__');
}

export function getOrCreateConv(userId, otherUserId) {
  return getConvId(userId, otherUserId);
}

export async function setTypingStatus(convId, userId, isTyping) {
  const docRef = doc(db, 'typing', `${convId}_${userId}`);
  if (isTyping) {
    await setDoc(docRef, { isTyping: true, ts: Date.now() });
  } else {
    try { await deleteDoc(docRef); } catch {}
  }
}

export function subscribeTypingStatus(convId, otherUserId, callback) {
  return onSnapshot(doc(db, 'typing', `${convId}_${otherUserId}`), (d) => {
     if (d.exists() && d.data().isTyping && (Date.now() - d.data().ts < 10000)) {
        callback(true);
     } else {
        callback(false);
     }
  });
}

// In Firebase, we just push to a global `messages` collection
export async function sendMessage(convId, fromId, text, type = 'text', mediaUrl = null, duration = null, replyTo = null) {
  const msgObj = {
    convId,
    from: fromId,
    type,
    text,
    mediaUrl,
    duration,
    ts: Date.now(),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: 'Today',
    read: false,
    ...(replyTo ? { replyTo } : {}),
  };
  await addDoc(collection(db, 'messages'), msgObj);
  return msgObj;
}

export async function markConvRead(convId, userId) {
  const q = query(collection(db, 'messages'), where('convId', '==', convId), where('read', '==', false));
  const snap = await getDocs(q);
  const batch = [];
  snap.forEach(docSnap => {
    if (docSnap.data().from !== userId) {
      batch.push(updateDoc(docSnap.ref, { read: true }));
    }
  });
  await Promise.all(batch);
}

export async function deleteMessage(convId, msgId) {
    const q = query(collection(db, 'messages'), where('convId', '==', convId));
    const snap = await getDocs(q);
    const msgDoc = snap.docs.find(d => d.id === msgId || d.data().id === msgId);
    if (msgDoc) await deleteDoc(msgDoc.ref);
}

// Subscribe to messages in a conversation
export function subscribeMessages(convId, callback) {
  const q = query(collection(db, 'messages'), where('convId', '==', convId));
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    msgs.sort((a, b) => a.ts - b.ts);
    callback(msgs);
  });
}

// Subscribes to ALL messages for a user, groups them into conversations
export function subscribeConversations(userId, callback) {
   const msgQuery = query(collection(db, 'messages'));
   
   return onSnapshot(msgQuery, async (snap) => {
      const allMsgs = snap.docs.map(d => ({id: d.id, ...d.data()}));
      allMsgs.sort((a, b) => a.ts - b.ts);
      const myMsgs = allMsgs.filter(m => m.convId && m.convId.includes(userId));
      
      const convos = {};
      myMsgs.forEach(m => {
          if(!convos[m.convId]) convos[m.convId] = [];
          convos[m.convId].push(m);
      });

      const usersSnap = await getDocs(collection(db, 'users'));
      const usersDict = {};
      usersSnap.docs.forEach(d => usersDict[d.id] = d.data());

      const finalConvs = Object.entries(convos).map(([id, msgs]) => {
         const otherId = id.split('__').find(i => i !== userId);
         const contact = usersDict[otherId];
         if (!contact) return null;
         return {
            id,
            contactId: otherId,
            contact,
            messages: msgs,
            unread: msgs.filter(m => m.from !== userId && !m.read).length
         };
      }).filter(Boolean).sort((a,b) => {
          const aLast = a.messages[a.messages.length - 1];
          const bLast = b.messages[b.messages.length - 1];
          return (bLast?.ts || 0) - (aLast?.ts || 0);
      });
      callback(finalConvs);
   });
}

// ── Statuses ──────────────────────────────────────────

export async function addStatus(userId, text, bg) {
  const status = {
    userId,
    text,
    bg: bg || 'linear-gradient(135deg, #128c7e, #075e54)',
    ts: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000
  };
  await addDoc(collection(db, 'statuses'), status);
}

export function subscribeStatuses(callback) {
  const q = query(collection(db, 'statuses'));
  return onSnapshot(q, async (snap) => {
     let statuses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
     statuses = statuses.filter(s => s.expiresAt > Date.now()); // prune
     
     const grouped = {};
     statuses.forEach(s => {
       if(!grouped[s.userId]) grouped[s.userId] = [];
       grouped[s.userId].push(s);
     });

     const usersSnap = await getDocs(collection(db, 'users'));
     const usersDict = {};
     usersSnap.docs.forEach(d => usersDict[d.id] = d.data());

     const finalGroups = Object.entries(grouped).map(([userId, list]) => ({
        user: usersDict[userId],
        statuses: list.sort((a,b) => a.ts - b.ts)
     })).filter(g => g.user);

     callback(finalGroups);
  });
}
