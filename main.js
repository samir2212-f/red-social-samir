// Importar Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// 🔑 CONFIGURA AQUÍ TU FIREBASE
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROJECT_ID.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROJECT_ID.appspot.com",
  messagingSenderId: "XXXXXX",
  appId: "TU_APP_ID"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Elementos
const authContainer = document.getElementById("auth-container");
const profileContainer = document.getElementById("profile-container");
const feedContainer = document.getElementById("feed-container");
const authMsg = document.getElementById("auth-msg");

const registerBtn = document.getElementById("registerBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const postBtn = document.getElementById("postBtn");

// Registrar usuario
registerBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;
  try {
    await createUserWithEmailAndPassword(auth, email, pass);
    authMsg.textContent = "Cuenta creada, inicia sesión.";
  } catch (e) {
    authMsg.textContent = e.message;
  }
});

// Iniciar sesión
loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    authMsg.textContent = e.message;
  }
});

// Cerrar sesión
logoutBtn.addEventListener("click", () => {
  signOut(auth);
});

// Detectar sesión
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const ref = doc(db, "profiles", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      authContainer.classList.add("hidden");
      profileContainer.classList.remove("hidden");
    } else {
      authContainer.classList.add("hidden");
      profileContainer.classList.add("hidden");
      feedContainer.classList.remove("hidden");
      loadPosts();
    }
  } else {
    authContainer.classList.remove("hidden");
    profileContainer.classList.add("hidden");
    feedContainer.classList.add("hidden");
  }
});

// Guardar perfil
saveProfileBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  const username = document.getElementById("username").value;
  const bio = document.getElementById("bio").value;
  await setDoc(doc(db, "profiles", user.uid), { username, bio });
  profileContainer.classList.add("hidden");
  feedContainer.classList.remove("hidden");
  loadPosts();
});

// Crear post
postBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  const text = document.getElementById("postText").value;
  if (text.trim() === "") return;
  await addDoc(collection(db, "posts"), {
    uid: user.uid,
    text,
    timestamp: Date.now()
  });
  document.getElementById("postText").value = "";
});

// Cargar posts en vivo
function loadPosts() {
  const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
  onSnapshot(q, (snapshot) => {
    const postsDiv = document.getElementById("posts");
    postsDiv.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const post = docSnap.data();
      const div = document.createElement("div");
      div.className = "post";
      div.innerHTML = `<p>${post.text}</p>`;
      postsDiv.appendChild(div);
    });
  });
}
