let conversations =
  JSON.parse(localStorage.getItem("myai_chats") || "[]");

let currentChat = [];

const messageBox = document.getElementById("message");
const chatArea = document.getElementById("chatArea");
const historyBox = document.getElementById("history");

function saveChats() {
  localStorage.setItem(
    "myai_chats",
    JSON.stringify(conversations)
  );
}

function renderHistory() {

  historyBox.innerHTML = "";

  conversations.forEach((chat, index) => {

    const div = document.createElement("div");

    div.className = "history-item";

    div.textContent =
      chat.title || "New conversation";

    div.onclick = () => loadChat(index);

    historyBox.appendChild(div);

  });
}

function loadChat(index) {

  currentChat = conversations[index].messages || [];

  chatArea.innerHTML = "";

  currentChat.forEach(message => {

    addMessage(
      message.role,
      message.content,
      false
    );

  });
}

function newChat() {

  currentChat = [];

  chatArea.innerHTML = `
    <div class="welcome">
      <div class="welcome-icon">✦</div>
      <h1>How can I help you?</h1>
      <p>Start a new conversation.</p>
    </div>
  `;

  messageBox.value = "";
}

function addMessage(role, text, scroll = true) {

  const wrapper = document.createElement("div");

  wrapper.className =
    `message ${role}`;

  const content = document.createElement("div");

  content.className = "message-content";

  content.textContent = text;

  wrapper.appendChild(content);

  chatArea.appendChild(wrapper);

  if (scroll) {
    chatArea.scrollTop = chatArea.scrollHeight;
  }
}

async function sendMessage() {

  const message = messageBox.value.trim();

  if (!message) return;

  if (currentChat.length === 0) {
    chatArea.innerHTML = "";
  }

  addMessage("user", message);

  currentChat.push({
    role: "user",
    content: message
  });

  messageBox.value = "";

  addMessage(
    "assistant",
    "Thinking..."
  );

  try {

    const response = await fetch(
      "/api/chat",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          message,
          history: currentChat.slice(0, -1),
          model:
            document.getElementById("model").value
        })
      }
    );

    const data = await response.json();

    const thinking =
      chatArea.lastElementChild;

    if (data.error) {

      thinking.querySelector(
        ".message-content"
      ).textContent = data.error;

      return;
    }

    thinking.querySelector(
      ".message-content"
    ).textContent = data.answer;

    currentChat.push({
      role: "assistant",
      content: data.answer
    });

    saveCurrentConversation();

  } catch (error) {

    chatArea.lastElementChild.querySelector(
      ".message-content"
    ).textContent =
      "Could not connect to the server.";

  }
}

function saveCurrentConversation() {

  if (currentChat.length === 0) return;

  const firstUser =
    currentChat.find(x => x.role === "user");

  const title =
    firstUser
      ? firstUser.content.slice(0, 35)
      : "New conversation";

  conversations.unshift({
    title,
    messages: currentChat
  });

  conversations =
    conversations.slice(0, 30);

  saveChats();

  renderHistory();
}

function handleKey(event) {

  if (event.key === "Enter" && !event.shiftKey) {

    event.preventDefault();

    sendMessage();
  }
}

function toggleTheme() {

  document.body.classList.toggle("dark");

  localStorage.setItem(
    "myai_dark",
    document.body.classList.contains("dark")
  );
}

function toggleSidebar() {

  document
    .querySelector(".sidebar")
    .classList.toggle("open");
}

function clearChats() {

  conversations = [];

  localStorage.removeItem("myai_chats");

  renderHistory();

  newChat();
}

function startVoice() {

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {

    alert(
      "Voice input is not supported by this browser."
    );

    return;
  }

  const recognition =
    new SpeechRecognition();

  recognition.lang = "en-IN";

  recognition.start();

  recognition.onresult = event => {

    messageBox.value =
      event.results[0][0].transcript;
  };
}

function fileSelected() {

  const file =
    document.getElementById("file").files[0];

  if (!file) return;

  messageBox.value +=
    `\n[Attached: ${file.name}]`;
}

if (
  localStorage.getItem("myai_dark") === "true"
) {
  document.body.classList.add("dark");
}

renderHistory();
