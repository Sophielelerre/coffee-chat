// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
// Make sure 'get' and 'update' are imported
import { getDatabase, ref, onValue, set, get, update } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAO-BoxQrr2hKD1T3F9BqR4WCeca5VcsOw",
    authDomain: "coffee-chat-again.firebaseapp.com",
    projectId: "coffee-chat-again",
    storageBucket: "coffee-chat-again.firebasestorage.app",
    messagingSenderId: "705055102684",
    appId: "1:705055102684:web:884100f5a0ce14ee344619",
    databaseURL: "https://coffee-chat-again-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app); // Initialize Firebase Authentication

// Get HTML elements
const statusToggle = document.getElementById('status-toggle');
const currentStatusText = document.getElementById('current-status-text');
const allUsersStatusDiv = document.getElementById('all-users-status');
const authStatusDiv = document.getElementById('auth-status');

const signupEmailInput = document.getElementById('signup-email');
const signupUsernameInput = document.getElementById('signup-username');
const signupPasswordInput = document.getElementById('signup-password');
const signupButton = document.getElementById('signup-button');

const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginUsernameInput = document.getElementById('login-username');
const loginButton = document.getElementById('login-button');

const logoutButton = document.getElementById('logout-button');

let loggedInUserId = null; // To store the current user's UID

// --- Firebase Authentication Functions ---

async function signUpUser(email, username, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("User signed up:", user);
        authStatusDiv.textContent = `Signed up as: ${user.email} (UID: ${user.uid})`;

        // Initialize user data in Realtime Database, including email and username
        await set(ref(database, `users/${user.uid}`), {
            email: user.email,
            username: username, // Save the chosen username
            status: 'no_chat'
        });
        console.log(`Initial status set for new user: ${user.email} with username: ${username}`);

    } catch (error) {
        console.error("Error signing up:", error.message);
        authStatusDiv.textContent = `Sign up error: ${error.message}`;
    }
}

async function logInUser(email, password, optionalUsername = null) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("User logged in:", user);
        authStatusDiv.textContent = `Logged in as: ${user.email} (UID: ${user.uid})`;

        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const userData = snapshot.val();
            let updates = {};

            if (!userData.email) {
                updates.email = user.email;
            }

            if (optionalUsername && optionalUsername.trim() !== '') {
                updates.username = optionalUsername.trim();
            } else if (!userData.username) {
                updates.username = user.email.split('@')[0];
            }

            if (!userData.status) {
                updates.status = 'no_chat';
            }

            if (Object.keys(updates).length > 0) {
                await update(userRef, updates);
                console.log("User profile updated in DB:", updates);
            }
        } else {
            console.log("User profile not found in DB, creating new entry.");
            await set(userRef, {
                email: user.email,
                username: optionalUsername || user.email.split('@')[0],
                status: 'no_chat'
            });
        }

    } catch (error) {
        console.error("Error logging in:", error.message);
        authStatusDiv.textContent = `Log in error: ${error.message}`;
    }
}

async function logOutUser() {
    try {
        await signOut(auth);
        console.log("User logged out");
        authStatusDiv.textContent = 'Logged out';
        statusToggle.checked = false;
        currentStatusText.textContent = 'Set to: No Chat';
        allUsersStatusDiv.innerHTML = '<p>Loading user statuses...</p>';
    } catch (error) {
        console.error("Error logging out:", error.message);
        authStatusDiv.textContent = `Log out error: ${error.message}`;
    }
}

// --- Realtime Database Interaction Functions ---

function setupAllUsersStatusListener() {
    const usersRef = ref(database, 'users');
    onValue(usersRef, (snapshot) => {
        const usersData = snapshot.val();
        allUsersStatusDiv.innerHTML = '';

        if (usersData) {
            for (const uid in usersData) {
                if (usersData.hasOwnProperty(uid)) {
                    const user = usersData[uid];
                    const displayName = user.username || user.email || 'Unknown User';
                    const userStatus = user.status === 'chat' ? 'Available' : 'Not Available';

                    const p = document.createElement('p');
                    p.textContent = `${displayName} Status: `;
                    const span = document.createElement('span');
                    span.id = `status-${uid}`;
                    span.textContent = userStatus;
                    p.appendChild(span);

                    allUsersStatusDiv.appendChild(p);
                }
            }
        } else {
            allUsersStatusDiv.innerHTML = '<p>No users found in the database.</p>';
        }
    });
}

function handleToggleChange() {
    if (auth.currentUser) {
        const isChecked = statusToggle.checked;
        const newStatus = isChecked ? 'chat' : 'no_chat';
        const currentUserStatusRef = ref(database, `users/${auth.currentUser.uid}/status`);
        set(currentUserStatusRef, newStatus);
        currentStatusText.textContent = `Set to: ${isChecked ? 'Chat' : 'No Chat'}`;
    } else {
        alert("You must be logged in to change your status.");
        statusToggle.checked = false;
    }
}

// --- Authentication State Observer ---
onAuthStateChanged(auth, (user) => {
    loggedInUserId = user ? user.uid : null;

    if (user) {
        console.log("User is signed in:", user.uid);
        authStatusDiv.textContent = `Logged in as: ${user.email} (UID: ${user.uid})`;

        const currentUserStatusRef = ref(database, `users/${user.uid}/status`);
        onValue(currentUserStatusRef, (snapshot) => {
            const status = snapshot.val();
            if (status !== null) {
                statusToggle.checked = status === 'chat';
                currentStatusText.textContent = `Set to: ${status === 'chat' ? 'Chat' : 'No Chat'}`;
            } else {
                set(currentUserStatusRef, 'no_chat');
                statusToggle.checked = false;
                currentStatusText.textContent = 'Set to: No Chat';
            }
        });

        get(currentUserStatusRef).then(snapshot => {
            if (!snapshot.exists()) {
                set(currentUserStatusRef, 'no_chat');
            }
        });

    } else {
        console.log("User is signed out");
        authStatusDiv.textContent = 'Logged out';
        statusToggle.checked = false;
        currentStatusText.textContent = 'Set to: No Chat';
    }
    setupAllUsersStatusListener();
});

// --- Event Listeners ---
statusToggle.addEventListener('change', handleToggleChange);

signupButton.addEventListener('click', () => {
    const email = signupEmailInput.value;
    const username = signupUsernameInput.value;
    const password = signupPasswordInput.value;
    if (email && username && password) {
        signUpUser(email, username, password);
    } else {
        alert('Please fill in all signup fields (email, username, password).');
    }
});

loginButton.addEventListener('click', () => {
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;
    const username = loginUsernameInput.value;
    if (email && password) {
        logInUser(email, password, username);
    } else {
        alert('Please fill in login email and password.');
    }
});

logoutButton.addEventListener('click', () => {
    logOutUser();
});