// Sử dụng configuration động
const API_BASE = window.APP_CONFIG.API_BASE;

// Global variables
let currentUser = null;
let currentChatId = null;
let socket = null;
let selectedUserForChat = null;

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const chatScreen = document.getElementById('chat-screen');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const registerBtn = document.getElementById('register-btn');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const currentUserSpan = document.getElementById('current-user');
const conversationsList = document.getElementById('conversations-list');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const fileInput = document.getElementById('file-input');
const fileBtn = document.getElementById('file-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const userSearch = document.getElementById('user-search');
const newChatModal = document.getElementById('new-chat-modal');
const modalUserSearch = document.getElementById('modal-user-search');
const usersList = document.getElementById('users-list');

// Authentication functions
async function register(username, email, password) {
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            showSuccess('Đăng ký thành công!');
            showChatScreen();
        } else {
            showError(data.error || 'Đăng ký thất bại');
        }
    } catch (error) {
        showError('Lỗi kết nối server');
    }
}

async function login(username, password) {
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            showSuccess('Đăng nhập thành công!');
            showChatScreen();
        } else {
            showError(data.error || 'Đăng nhập thất bại');
        }
    } catch (error) {
        showError('Lỗi kết nối server');
    }
}

async function logout() {
    try {
        const token = localStorage.getItem('token');
        if (token) {
            await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        localStorage.removeItem('token');
        showAuthScreen();
        if (socket) {
            socket.disconnect();
        }
    }
}

async function getCurrentUser() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;

        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            const data = await response.json();
            return data.user;
        } else {
            localStorage.removeItem('token');
            return null;
        }
    } catch (error) {
        localStorage.removeItem('token');
        return null;
    }
}

// Chat functions
async function loadConversations() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/chat/conversations`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            const data = await response.json();
            displayConversations(data.chats);
        }
    } catch (error) {
        console.error('Error loading conversations:', error);
    }
}

async function loadMessages(chatId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/chat/messages/${chatId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            const data = await response.json();
            displayMessages(data.messages);
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

async function sendMessage(content, file = null) {
    if (!content.trim() && !file) return;

    try {
        const token = localStorage.getItem('token');
        const formData = new FormData();

        formData.append('chatId', currentChatId);
        formData.append('content', content);

        if (file) {
            formData.append('file', file);
            formData.append('messageType', file.type.startsWith('image/') ? 'image' : 'file');
        }

        const response = await fetch(`${API_BASE}/chat/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            messageInput.value = '';
            if (file) {
                fileInput.value = '';
            }
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showError('Lỗi gửi tin nhắn');
    }
}

async function createConversation(otherUserId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/chat/conversation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ otherUserId })
        });

        if (response.ok) {
            const data = await response.json();
            loadConversations();
            return data.chatId;
        }
    } catch (error) {
        console.error('Error creating conversation:', error);
    }
    return null;
}

async function searchUsers(query) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/chat/users?search=${encodeURIComponent(query)}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            const data = await response.json();
            return data.users;
        }
    } catch (error) {
        console.error('Error searching users:', error);
    }
    return [];
}

// UI functions
function showAuthScreen() {
    authScreen.classList.remove('hidden');
    chatScreen.classList.add('hidden');
}

function showChatScreen() {
    authScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
}

function showSuccess(message) {
    // Simple alert for now, can be improved with better notifications
    alert(message);
}

function showError(message) {
    alert(message);
}

function displayConversations(chats) {
    // Kiểm tra conversationsList có tồn tại không
    if (!conversationsList) {
        console.error('Conversations list not found');
        return;
    }

    conversationsList.innerHTML = '';

    if (!Array.isArray(chats)) {
        console.error('Chats is not an array:', chats);
        conversationsList.innerHTML = '<div class="no-conversations">Lỗi tải danh sách cuộc hội thoại</div>';
        return;
    }

    if (chats.length === 0) {
        conversationsList.innerHTML = '<div class="no-conversations">Chưa có cuộc hội thoại nào</div>';
        return;
    }

    chats.forEach(chat => {
        const chatElement = document.createElement('div');
        chatElement.className = 'conversation-item';
        chatElement.innerHTML = `
            <div class="conversation-name">${chat.name || 'Chat'}</div>
            <div class="conversation-meta">
                <span class="last-message">${chat.last_message || 'Chưa có tin nhắn'}</span>
                <span class="message-count">${chat.message_count || 0}</span>
            </div>
        `;

        chatElement.addEventListener('click', () => {
            selectConversation(chat.id, chatElement);
        });

        conversationsList.appendChild(chatElement);
    });
}

function displayMessages(messages) {
    try {
        // Kiểm tra messagesContainer có tồn tại không
        if (!messagesContainer) {
            console.error('Messages container not found');
            return;
        }

        messagesContainer.innerHTML = '';

        if (!Array.isArray(messages)) {
            console.error('Messages is not an array:', messages);
            return;
        }

        messages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.className = `message ${message.sender_id === currentUser.id ? 'sent' : 'received'}`;

            const messageTime = new Date(message.created_at).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit'
            });

            let fileContent = '';
            if (message.file_path) {
                if (message.message_type === 'image') {
                    fileContent = `
                        <div class="message-file">
                            <div class="file-info">
                                <i class="fas fa-image file-icon"></i>
                                <span>${message.file_name}</span>
                            </div>
                            <img src="${window.APP_CONFIG.UPLOAD_URL}/${message.file_path}"
                                 alt="${message.file_name}"
                                 style="max-width: 200px; border-radius: 8px; margin-top: 8px;">
                        </div>
                    `;
                } else {
                    fileContent = `
                        <div class="message-file">
                            <div class="file-info">
                                <i class="fas fa-file file-icon"></i>
                                <span>${message.file_name}</span>
                            </div>
                        </div>
                    `;
                }
            }

            messageElement.innerHTML = `
                <div class="message-content">
                    <div class="message-header">
                        <span class="sender-name">${message.sender_name}</span>
                        <span class="message-time">${messageTime}</span>
                    </div>
                    <div class="message-text">${message.content}</div>
                    ${fileContent}
                </div>
            `;

            messagesContainer.appendChild(messageElement);
        });

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
        console.error('Error displaying messages:', error);
    }
}

function selectConversation(chatId, element) {
    try {
        // Remove active class from all conversations
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to selected conversation
        if (element) {
            element.classList.add('active');
        }
        currentChatId = chatId;

        // Show chat area
        const noChatSelected = document.getElementById('no-chat-selected');
        const chatArea = document.getElementById('chat-area');

        if (noChatSelected && chatArea) {
            noChatSelected.classList.add('hidden');
            chatArea.classList.remove('hidden');
        }

        // Load messages
        loadMessages(chatId);

        // Join chat room via Socket.io
        if (socket) {
            socket.emit('join-chat', chatId);
        }
    } catch (error) {
        console.error('Error selecting conversation:', error);
    }
}

// Socket.io setup
function initializeSocket() {
    socket = io(window.APP_CONFIG.SOCKET_URL);

    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('receive-message', (data) => {
        if (data.chatId === currentChatId) {
            // Reload messages if we're in the same chat
            loadMessages(currentChatId);
        } else {
            // Update conversation list to show new message
            loadConversations();
        }
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is already logged in
    currentUser = await getCurrentUser();
    if (currentUser) {
        showChatScreen();
        currentUserSpan.textContent = currentUser.username;
        initializeSocket();
        loadConversations();
    } else {
        showAuthScreen();
    }

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (btn.dataset.tab === 'login') {
                loginForm.classList.remove('hidden');
                registerForm.classList.add('hidden');
            } else {
                registerForm.classList.remove('hidden');
                loginForm.classList.add('hidden');
            }
        });
    });

    // Login form
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        login(username, password);
    });

    // Register form
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;

        if (password !== confirmPassword) {
            showError('Mật khẩu xác nhận không khớp');
            return;
        }

        register(username, email, password);
    });

    // Logout
    logoutBtn.addEventListener('click', logout);

    // Send message
    sendBtn.addEventListener('click', () => {
        const content = messageInput.value.trim();
        sendMessage(content);
    });

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const content = messageInput.value.trim();
            sendMessage(content);
        }
    });

    // File upload
    fileBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            sendMessage('', file);
        }
    });

    // New chat
    newChatBtn.addEventListener('click', () => {
        newChatModal.classList.remove('hidden');
        loadUsersForModal('');
    });

    // Modal close
    document.querySelector('.modal-close').addEventListener('click', () => {
        newChatModal.classList.add('hidden');
    });

    document.querySelector('.modal-cancel').addEventListener('click', () => {
        newChatModal.classList.add('hidden');
    });

    // User search
    userSearch.addEventListener('input', (e) => {
        // Debounce search
        clearTimeout(userSearch.timeout);
        userSearch.timeout = setTimeout(() => {
            // This would be for searching in existing conversations
            // For now, we'll implement basic filtering
        }, 300);
    });

    // Modal user search
    modalUserSearch.addEventListener('input', (e) => {
        clearTimeout(modalUserSearch.timeout);
        modalUserSearch.timeout = setTimeout(() => {
            loadUsersForModal(e.target.value);
        }, 300);
    });

    // Click outside modal to close
    newChatModal.addEventListener('click', (e) => {
        if (e.target === newChatModal) {
            newChatModal.classList.add('hidden');
        }
    });
});

// Helper functions
async function loadUsersForModal(query) {
    const users = await searchUsers(query);
    usersList.innerHTML = '';

    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'user-item';
        userElement.innerHTML = `
            <span class="user-name">${user.username}</span>
        `;

        userElement.addEventListener('click', async () => {
            const chatId = await createConversation(user.id);
            if (chatId) {
                newChatModal.classList.add('hidden');
                selectConversation(chatId, null);
            }
        });

        usersList.appendChild(userElement);
    });
}