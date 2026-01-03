import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
const firebaseConfig = {
    apiKey: "AIzaSyCz-xq2PL3XA4AuCLLgprvWv1V2iq_OxCU",
    authDomain: "school-management-5bfd3.firebaseapp.com",
    projectId: "school-management-5bfd3",
    storageBucket: "school-management-5bfd3.firebasestorage.app",
    messagingSenderId: "1010498967450",
    appId: "1:1010498967450:web:d2f24e3d5aed66138acc23"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "school-management-5bfd3";

let currentUser = null;
let currentRole = "teacher";
let students = [];
let attendanceData = {};
let marksData = {};

// AUTHENTICATION
document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
        alert("Invalid Login Credentials");
    }
});

document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
    if (user) {
      alert("LOGGED IN EMAIL: " + user.email);
        currentUser = user;
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        
        const q = query(
  collection(db, "users")
  where("email", "==", user.email.toLowerCase())
);

const snap = await getDocs(q);

if (!snap.empty) {
  currentRole = snap.docs[0].data().role;
} else {
  currentRole = "teacher";
}

document.getElementById('role-badge').innerText = currentRole;
applyPermissions();
initDataSync();
    } else {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
    }
    lucide.createIcons();
});

function applyPermissions() {
    const isAdmin = currentRole === 'admin' || currentRole === 'superadmin';
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin ? 'flex' : 'none');
}

// DATA SYNC
function initDataSync() {
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'students');
    onSnapshot(q, (snap) => {
        students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderDashboard();
        renderStudents();
        renderFees();
    });
}

// NAVIGATION
window.switchView = (viewId) => {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    document.getElementById('page-title').innerText = viewId.charAt(0).toUpperCase() + viewId.slice(1);
    
    if(viewId === 'attendance') loadAttendanceList();
    if(viewId === 'marks') loadMarksList();
    
    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.replace('text-blue-600', 'text-slate-400');
    });
    event.currentTarget.classList.replace('text-slate-400', 'text-blue-600');
    lucide.createIcons();
};

// STUDENT ACTIONS
window.openModal = () => document.getElementById('student-modal').classList.remove('hidden');
window.closeModal = () => document.getElementById('student-modal').classList.add('hidden');

document.getElementById('add-student-confirm').addEventListener('click', async () => {
    const name = document.getElementById('m-name').value;
    const cls = document.getElementById('m-class').value;
    const roll = document.getElementById('m-roll').value;
    const phone = document.getElementById('m-phone').value;

    if(!name || !roll) return;

    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), {
        name, class: cls, roll, phone, feePaid: false, createdAt: serverTimestamp()
    });
    closeModal();
});

function renderDashboard() {
    document.getElementById('stat-students').innerText = students.length;
    document.getElementById('stat-paid').innerText = students.filter(s => s.feePaid).length;
}

function renderStudents() {
    const container = document.getElementById('student-list');
    container.innerHTML = students.sort((a,b) => a.roll - b.roll).map(s => `
        <div class="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
            <div>
                <p class="font-bold">${s.name} <span class="text-slate-400 text-xs ml-2">#${s.roll}</span></p>
                <p class="text-[10px] text-slate-500 uppercase font-bold">Class ${s.class}</p>
            </div>
            <a href="tel:${s.phone}" class="p-2 bg-green-50 text-green-600 rounded-full"><i data-lucide="phone" class="w-4 h-4"></i></a>
        </div>
    `).join('');
    lucide.createIcons();
}

// ATTENDANCE
function loadAttendanceList() {
    const cls = document.getElementById('attn-class-select').value;
    const filtered = students.filter(s => s.class === cls);
    const container = document.getElementById('attendance-list');
    attendanceData = {};
    
    container.innerHTML = filtered.map(s => {
        attendanceData[s.id] = 'P';
        return `
        <div class="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm">
            <span class="font-bold">${s.name}</span>
            <div class="flex gap-2 bg-slate-100 p-1 rounded-xl">
                <button onclick="markA('${s.id}', 'P', this)" class="px-4 py-1 bg-green-600 text-white rounded-lg text-xs font-bold">P</button>
                <button onclick="markA('${s.id}', 'A', this)" class="px-4 py-1 text-slate-400 rounded-lg text-xs font-bold">A</button>
            </div>
        </div>
    `}).join('');
    document.getElementById('save-attendance').classList.toggle('hidden', filtered.length === 0);
}

window.markA = (id, status, btn) => {
    attendanceData[id] = status;
    const parent = btn.parentElement;
    parent.querySelectorAll('button').forEach(b => b.className = "px-4 py-1 text-slate-400 rounded-lg text-xs font-bold");
    btn.className = `px-4 py-1 ${status === 'P' ? 'bg-green-600' : 'bg-red-500'} text-white rounded-lg text-xs font-bold`;
};

document.getElementById('save-attendance').addEventListener('click', async () => {
    const cls = document.getElementById('attn-class-select').value;
    const date = new Date().toISOString().split('T')[0];
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'attendance', `${cls}_${date}`), {
        records: attendanceData, date, class: cls, timestamp: serverTimestamp()
    });
    alert("Attendance Saved");
    switchView('dashboard');
});

// FEES
function renderFees() {
    const container = document.getElementById('view-fees');
    container.innerHTML = `<h3 class="font-bold mb-4">Fee Management</h3>` + students.map(s => `
        <div class="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm" onclick="toggleFee('${s.id}', ${s.feePaid})">
            <span class="font-bold">${s.name}</span>
            <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase ${s.feePaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                ${s.feePaid ? 'Paid' : 'Unpaid'}
            </span>
        </div>
    `).join('');
}

window.toggleFee = async (id, current) => {
    if(currentRole === 'teacher') return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', id), { feePaid: !current });
};

// MARKS
function loadMarksList() {
    const container = document.getElementById('marks-list');
    marksData = {};
    container.innerHTML = students.map(s => `
        <div class="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm">
            <span class="font-bold">${s.name}</span>
            <input type="number" placeholder="Marks" onchange="marksData['${s.id}']=this.value" class="w-20 p-2 bg-slate-50 rounded-lg text-center border">
        </div>
    `).join('');
    document.getElementById('save-marks').classList.remove('hidden');
}

document.getElementById('save-marks').addEventListener('click', async () => {
    const subject = document.getElementById('marks-subject').value;
    if(!subject) return alert("Enter Subject");
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'results'), {
        subject, data: marksData, timestamp: serverTimestamp()
    });
    alert("Marks Saved");
    switchView('dashboard');
});

lucide.createIcons();
