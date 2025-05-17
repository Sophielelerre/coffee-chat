const statusToggle = document.getElementById('status-toggle');
const currentStatusText = document.getElementById('current-status-text');
const user1StatusDisplay = document.getElementById('user1-status');
const user2StatusDisplay = document.getElementById('user2-status');

// For this simple prototype, we'll still simulate having two distinct users.
const currentUserId = 'user1'; // In a real app, you'd have a way to identify the logged-in user.
const otherUserId = 'user2';   // The other user we are communicating with for this prototype.

// We'll store the statuses of both users in this object for our local simulation.
// In a real app, this data would come from Firebase.
let userStatuses = {
    [currentUserId]: 'no_chat', // Initialize the current user's status
    [otherUserId]: 'no_chat'    // Initialize the other user's status
};

// Function to update the displayed statuses of both users on the page.
function updateStatusDisplay() {
    user1StatusDisplay.textContent = userStatuses['user1'] === 'chat' ? 'Available' : 'Not Available';
    user2StatusDisplay.textContent = userStatuses['user2'] === 'chat' ? 'Available' : 'Not Available';
}

// Function that gets called when the toggle switch is changed.
function handleToggleChange() {
    const isChecked = statusToggle.checked;
    const newStatus = isChecked ? 'chat' : 'no_chat';

    // Update the current user's status in our local simulation.
    userStatuses[currentUserId] = newStatus;

    // Update the text indicating the current user's status.
    currentStatusText.textContent = `Set to: ${isChecked ? 'Chat' : 'No Chat'}`;

    // In the next steps with Firebase, this is where you would:
    // 1. Update the current user's status in the Firebase Realtime Database.
    // 2. Firebase would then trigger an update for the other connected user.

    // For this local simulation, we are NOT changing the other user's status here.
    // The other user's status will remain as it was initialized or as we might
    // manually change it for testing this local setup.

    // We still need to update the display to reflect the (potentially unchanged)
    // statuses of both users.
    updateStatusDisplay();
}

// Initialize the toggle and status text based on the current user's initial status.
if (userStatuses[currentUserId] === 'chat') {
    statusToggle.checked = true;
    currentStatusText.textContent = 'Set to: Chat';
} else {
    statusToggle.checked = false;
    currentStatusText.textContent = 'Set to: No Chat';
}

// Add an event listener to the toggle. When its state changes, call handleToggleChange.
statusToggle.addEventListener('change', handleToggleChange);

// Initial update of the status display when the page loads.
updateStatusDisplay();