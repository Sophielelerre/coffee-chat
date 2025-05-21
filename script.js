// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
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
const auth = getAuth(app);

// Get HTML elements
const statusToggle = document.getElementById('status-toggle');
const currentStatusText = document.getElementById('current-status-text');
const allUsersStatusDiv = document.getElementById('all-users-status');
const authStatusDiv = document.getElementById('auth-status'); // For login/signup messages

const signupEmailInput = document.getElementById('signup-email');
const signupUsernameInput = document.getElementById('signup-username');
const signupPasswordInput = document.getElementById('signup-password');
const signupButton = document.getElementById('signup-button');

const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginUsernameInput = document.getElementById('login-username');
const loginButton = document.getElementById('login-button');

const logoutButton = document.getElementById('logout-button');

// NEW: Get references to the page containers
const authPage = document.getElementById('auth-page');
const statusPage = document.getElementById('status-page');

// Initial check for element existence
if (!authPage) console.error("Error: auth-page element not found!");
if (!statusPage) console.error("Error: status-page element not found!");

let loggedInUserId = null; // To store the current user's UID

// --- Page Management Functions ---
// These functions control which 'page' div is visible
function showAuthPage() {
    console.log("Attempting to show Auth Page.");
    if (authPage) {
        authPage.style.display = 'block';
        console.log("authPage display after set:", authPage.style.display);
    } else {
        console.error("authPage element is null when trying to show Auth Page.");
    }

    if (statusPage) {
        statusPage.style.display = 'none';
        console.log("statusPage display after set (hide):", statusPage.style.display);
    } else {
        console.error("statusPage element is null when trying to hide status Page.");
    }
}

function showStatusPage() {
    console.log("Attempting to show Status Page.");
    if (authPage) {
        authPage.style.display = 'none';
        console.log("authPage display after set (hide):", authPage.style.display);
    } else {
        console.error("authPage element is null when trying to hide Auth Page.");
    }

    if (statusPage) {
        statusPage.style.display = 'block';
        console.log("statusPage display after set:", statusPage.style.display);
    } else {
        console.error("statusPage element is null when trying to show Status Page.");
    }
}

// --- Firebase Authentication Functions ---

async function signUpUser(email, username, password) {
    try {
        console.log("signUpUser: Attempting to create user...");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("signUpUser: User created:", user.uid);
        authStatusDiv.textContent = `Signed up! Welcome, ${username || user.email}!`; // Display welcome on auth page

        // Initialize user data in Realtime Database, including email and username
        await set(ref(database, `users/${user.uid}`), {
            email: user.email,
            username: username,
            status: 'no_chat'
        });
        console.log("signUpUser: Initial user data set in DB.");

    } catch (error) {
        console.error("signUpUser: Error signing up:", error.message);
        authStatusDiv.textContent = `Sign up error: ${error.message}`;
    }
}

async function logInUser(email, password, optionalUsername = null) {
    try {
        console.log("logInUser: Attempting to sign in...");
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("logInUser: User signed in:", user.uid);
        authStatusDiv.textContent = `Logged in! Welcome back!`; // Display welcome on auth page

        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            console.log("logInUser: User profile exists in DB.");
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
                console.log("logInUser: User profile updated in DB:", updates);
            }
        } else {
            console.log("logInUser: User profile not found in DB, creating new entry.");
            await set(userRef, {
                email: user.email,
                username: optionalUsername || user.email.split('@')[0],
                status: 'no_chat'
            });
        }

    } catch (error) {
        console.error("logInUser: Error logging in:", error.message);
        authStatusDiv.textContent = `Log in error: ${error.message}`;
    }
}

async function logOutUser() {
    try {
        console.log("logOutUser: Attempting to sign out...");
        await signOut(auth);
        console.log("logOutUser: User logged out.");
        statusToggle.checked = false;
        currentStatusText.textContent = 'Set to: No Chat';
        allUsersStatusDiv.innerHTML = '<p>Loading user statuses...</p>'; // Clear status list
    } catch (error) {
        console.error("logOutUser: Error logging out:", error.message);
        authStatusDiv.textContent = `Log out error: ${error.message}`; // Show error on auth page if it fails
    }
}

// --- Realtime Database Interaction Functions ---

function setupAllUsersStatusListener() {
    const usersRef = ref(database, 'users');
    onValue(usersRef, (snapshot) => {
        const usersData = snapshot.val();
        allUsersStatusDiv.innerHTML = ''; // Clear previous list

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
        // This case should ideally not happen if page logic is correct (toggle only visible when logged in)
    }
}

// --- Authentication State Observer ---
// This is the primary controller for which page is shown
onAuthStateChanged(auth, (user) => {
    loggedInUserId = user ? user.uid : null;
    console.log("onAuthStateChanged triggered. User:", user ? user.uid : "null (logged out)");


    if (user) {
        console.log("onAuthStateChanged: User is signed in. Calling showStatusPage().");
        showStatusPage(); // This should be the key
        authStatusDiv.textContent = ''; // Clear auth message once page switches

        // Set up listener for current user's status when logged in
        const currentUserStatusRef = ref(database, `users/${user.uid}/status`);
        onValue(currentUserStatusRef, (snapshot) => {
            const status = snapshot.val();
            if (status !== null) {
                statusToggle.checked = status === 'chat';
                currentStatusText.textContent = `Set to: ${status === 'chat' ? 'Chat' : 'No Chat'}`;
            } else {
                // If no status, default to no_chat and update DB
                set(currentUserStatusRef, 'no_chat');
                statusToggle.checked = false;
                currentStatusText.textContent = 'Set to: No Chat';
            }
        });

        // Ensure initial status exists for the user when they log in/page loads
        get(currentUserStatusRef).then(snapshot => {
            if (!snapshot.exists()) {
                set(currentUserStatusRef, 'no_chat');
            }
        });

    } else {
        console.log("onAuthStateChanged: User is signed out. Calling showAuthPage().");
        showAuthPage();
        authStatusDiv.textContent = ''; // Clear auth message
    }
    // Always set up the all users status listener; it will only be visible on status page
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
        authStatusDiv.textContent = 'Please fill in all signup fields (email, username, password).';
    }
});

loginButton.addEventListener('click', () => {
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;
    const username = loginUsernameInput.value; // Optional username for update
    if (email && password) {
        logInUser(email, password, username);
    } else {
        authStatusDiv.textContent = 'Please fill in login email and password.';
    }
});

logoutButton.addEventListener('click', () => {
    logOutUser();
});

// Initial check: The onAuthStateChanged listener is asynchronous and will fire
// immediately on page load to determine the user's state and show the correct page.