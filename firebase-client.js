// Hasnain Digital Marketer - Firebase Client Integration (Auth & Firestore)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocFromServer
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

let app = null;
let auth = null;
let db = null;
let currentUser = null;
let unsubscribeInquiries = null;

function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid || auth?.currentUser?.uid || null,
      email: currentUser?.email || auth?.currentUser?.email || null,
      emailVerified: currentUser?.emailVerified || auth?.currentUser?.emailVerified || null,
      isAnonymous: currentUser?.isAnonymous || auth?.currentUser?.isAnonymous || null,
      providerInfo: (currentUser?.providerData || auth?.currentUser?.providerData || []).map(p => ({
        providerId: p.providerId,
        email: p.email
      }))
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error && error.message && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration.");
    }
  }
}

export async function initFirebase() {
  try {
    const res = await fetch('/api/firebase-config');
    const config = await res.json();
    if (!config.configured) {
      console.log('Firebase is not configured on this server.');
      return null;
    }

    app = initializeApp({
      projectId: config.projectId,
      appId: config.appId,
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId
    });

    db = getFirestore(app, config.firestoreDatabaseId);
    auth = getAuth(app);

    // Test connection on initial boot
    testConnection();

    // Listen for auth state changes
    onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      updateAuthUI(user);

      if (user) {
        // Upsert user profile to Firestore
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          const now = new Date().toISOString();
          const photo = (user.photoURL || '').slice(0, 1000);
          const displayName = (user.displayName || 'Client').slice(0, 100);

          if (!userSnap.exists()) {
            await setDoc(userRef, {
              id: user.uid,
              displayName,
              email: user.email || '',
              photoURL: photo,
              createdAt: now,
              lastLoginAt: now
            });
          } else {
            const existingData = userSnap.data() || {};
            await setDoc(userRef, {
              id: user.uid,
              displayName: displayName || existingData.displayName || 'Client',
              email: user.email || existingData.email || '',
              photoURL: photo || existingData.photoURL || '',
              createdAt: existingData.createdAt || now,
              lastLoginAt: now
            }, { merge: true });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }

        // Auto-fill contact form if present
        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        if (nameInput && !nameInput.value && user.displayName) {
          nameInput.value = user.displayName;
        }
        if (emailInput && !emailInput.value && user.email) {
          emailInput.value = user.email;
        }

        // Listen to user's saved inquiries
        listenToUserInquiries(user.uid);
      } else {
        if (unsubscribeInquiries) {
          unsubscribeInquiries();
          unsubscribeInquiries = null;
        }
      }
    });

    setupAuthEventListeners();
    return { app, auth, db };
  } catch (err) {
    console.warn('Firebase initialization error:', err.message);
    return null;
  }
}

function updateAuthUI(user) {
  const authBar = document.getElementById('authBar');
  const signInBtn = document.getElementById('googleSignInBtn');
  const userProfileBadge = document.getElementById('userProfileBadge');
  const userAvatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');

  if (!authBar || !signInBtn) return;

  if (user) {
    signInBtn.style.display = 'none';
    if (userProfileBadge) {
      userProfileBadge.style.display = 'inline-flex';
      if (userAvatar) {
        if (user.photoURL) {
          userAvatar.src = user.photoURL;
        } else {
          userAvatar.src = 'images/favicon.svg';
        }
      }
      if (userName) {
        userName.textContent = user.displayName ? user.displayName.split(' ')[0] : 'Client';
      }
    }
  } else {
    signInBtn.style.display = 'inline-flex';
    if (userProfileBadge) {
      userProfileBadge.style.display = 'none';
    }
  }
}

function setupAuthEventListeners() {
  const signInBtn = document.getElementById('googleSignInBtn');
  if (signInBtn) {
    signInBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!auth) return;
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } catch (err) {
        console.error('Google Sign-In failed:', err.message);
      }
    });
  }

  const signOutBtn = document.getElementById('signOutBtn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!auth) return;
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Sign Out error:', err.message);
      }
    });
  }

  const myInquiriesBtn = document.getElementById('myInquiriesBtn');
  const inquiriesModal = document.getElementById('inquiriesModal');
  const closeInquiriesModal = document.getElementById('closeInquiriesModal');
  const inquiriesModalOverlay = document.getElementById('inquiriesModalOverlay');

  if (myInquiriesBtn && inquiriesModal) {
    myInquiriesBtn.addEventListener('click', (e) => {
      e.preventDefault();
      inquiriesModal.style.display = 'flex';
      inquiriesModal.classList.add('active');
    });
  }

  if (closeInquiriesModal && inquiriesModal) {
    closeInquiriesModal.addEventListener('click', () => {
      inquiriesModal.style.display = 'none';
      inquiriesModal.classList.remove('active');
    });
  }

  if (inquiriesModalOverlay && inquiriesModal) {
    inquiriesModalOverlay.addEventListener('click', () => {
      inquiriesModal.style.display = 'none';
      inquiriesModal.classList.remove('active');
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && inquiriesModal && inquiriesModal.classList.contains('active')) {
      inquiriesModal.style.display = 'none';
      inquiriesModal.classList.remove('active');
    }
  });
}

function listenToUserInquiries(userId) {
  if (!db) return;
  const inquiriesPath = `users/${userId}/inquiries`;
  try {
    const q = query(collection(db, 'users', userId, 'inquiries'), orderBy('createdAt', 'desc'));
    unsubscribeInquiries = onSnapshot(q, (snapshot) => {
      const inquiries = [];
      snapshot.forEach((d) => inquiries.push({ id: d.id, ...d.data() }));
      renderInquiriesList(inquiries);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, inquiriesPath);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, inquiriesPath);
  }
}

function renderInquiriesList(inquiries) {
  const container = document.getElementById('inquiriesList');
  const badge = document.getElementById('inquiryCountBadge');
  if (badge) {
    badge.textContent = inquiries.length > 0 ? String(inquiries.length) : '';
    badge.style.display = inquiries.length > 0 ? 'inline-block' : 'none';
  }

  if (!container) return;

  if (inquiries.length === 0) {
    container.innerHTML = `
      <div class="empty-inquiries">
        <p>No project inquiries submitted yet.</p>
        <small>Submit a message through the contact form to track your project requests here.</small>
      </div>
    `;
    return;
  }

  container.innerHTML = inquiries.map(inq => `
    <div class="inquiry-card">
      <div class="inquiry-card-header">
        <span class="inquiry-service">${escapeText(inq.service || 'General Project')}</span>
        <span class="inquiry-status status-${(inq.status || 'new').toLowerCase()}">${escapeText(inq.status || 'New')}</span>
      </div>
      <h4 class="inquiry-subject">${escapeText(inq.subject || 'Project Inquiry')}</h4>
      <p class="inquiry-snippet">${escapeText(inq.message || '')}</p>
      <div class="inquiry-meta">
        <span>Submitted: ${new Date(inq.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  `).join('');
}

function escapeText(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// Public helper to persist contact inquiry to Firestore
export async function persistInquiryToFirestore(inquiry) {
  if (!db || !currentUser) return null;
  const path = `users/${currentUser.uid}/inquiries`;
  try {
    const inquiryId = 'inq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const docRef = doc(db, 'users', currentUser.uid, 'inquiries', inquiryId);
    const data = {
      id: inquiryId,
      userId: currentUser.uid,
      name: inquiry.name,
      email: inquiry.email,
      subject: inquiry.subject,
      service: inquiry.service || 'General Project',
      message: inquiry.message,
      status: 'new',
      createdAt: new Date().toISOString()
    };
    await setDoc(docRef, data);
    return inquiryId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
    return null;
  }
}

// Public helper to persist consultation chat session to Firestore
export async function persistChatSessionToFirestore(sessionId, lastMessage, leadStatus) {
  if (!db || !currentUser) return null;
  const path = `users/${currentUser.uid}/chat_sessions/${sessionId}`;
  try {
    const docRef = doc(db, 'users', currentUser.uid, 'chat_sessions', sessionId);
    const data = {
      id: sessionId,
      userId: currentUser.uid,
      lastMessage: (lastMessage || '').slice(0, 1000),
      leadStatus: leadStatus || 'General Visitor',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(docRef, data, { merge: true });
    return sessionId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return null;
  }
}

// Attach to window for script.js integration
window.FirebaseApp = {
  initFirebase,
  persistInquiryToFirestore,
  persistChatSessionToFirestore,
  getCurrentUser: () => currentUser
};

// Initialize automatically on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFirebase);
} else {
  initFirebase();
}
