import { useAuth } from "@/app/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import API_URL from "@/services/config/api";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Chat = {
  id?: string;
  chatId?: string;
  userId?: string;
  adminId?: string | null;
  userName?: string;
  username?: string;
  user?: {
    id?: string;
    userName?: string;
    username?: string;
  };
  admin?: any;
  status?: string | number;
  createdAt?: string;
  closedAt?: string | null;
  messages?: any;
};

type Message = {
  id?: string;
  text?: string;
  message?: string;
  content?: string;
  senderId?: string;
  userId?: string;
  createdAt?: string;
  sentAt?: string;
};

function authH(token: string | null) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token ?? ""}`,
  };
}

async function readResponse(res: Response) {
  const text = await res.text();

  if (!text) {
    return {
      text: "",
      data: null,
    };
  }

  try {
    return {
      text,
      data: JSON.parse(text),
    };
  } catch {
    return {
      text,
      data: null,
    };
  }
}

function unwrapArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.$values)) return data.$values;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.$values)) return data.data.$values;
  if (Array.isArray(data?.messages)) return data.messages;
  if (Array.isArray(data?.messages?.$values)) return data.messages.$values;

  return [];
}

function getChatId(chat: any): string {
  return String(chat?.id ?? chat?.chatId ?? "");
}

function getChatUser(chat: any): string {
  return String(
    chat?.userName ??
      chat?.username ??
      chat?.user?.userName ??
      chat?.user?.username ??
      chat?.userId ??
      "Customer",
  );
}

function isClosedChat(chat: any): boolean {
  const status = String(chat?.status ?? "").toLowerCase();

  return chat?.closedAt != null || status === "closed";
}

function normalizeChats(data: any): Chat[] {
  return unwrapArray(data).filter((chat) => {
    if (!chat || chat.$ref) return false;
    if (!getChatId(chat)) return false;
    if (isClosedChat(chat)) return false;

    return true;
  });
}

function normalizeMessages(data: any): Message[] {
  return unwrapArray(data)
    .filter((message) => message && !message.$ref)
    .map((message: any, index: number) => ({
      id: String(
        message.id ??
          message.messageId ??
          `${index}-${message.sentAt ?? Date.now()}`,
      ),
      text: message.text ?? message.message ?? message.content ?? "",
      senderId: message.senderId ?? "",
      userId: message.userId,
      createdAt: message.createdAt ?? message.sentAt ?? "",
    }));
}

function cleanError(text: string, fallback: string) {
  if (!text) return fallback;

  try {
    const json = JSON.parse(text);

    if (json.errors) {
      const messages = Object.values(json.errors).flat().join("\n");
      return messages || json.title || fallback;
    }

    return json.title || json.message || text || fallback;
  } catch {
    return text || fallback;
  }
}

export default function SupportManager() {
  const { theme } = useTheme();
  const { token, userId, loading: authLoading } = useAuth();

  const [waitingChats, setWaitingChats] = useState<Chat[]>([]);
  const [myChats, setMyChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [closeModal, setCloseModal] = useState(false);

  const [messageModal, setMessageModal] = useState({
    visible: false,
    title: "",
    message: "",
    type: "success" as "success" | "error",
  });

  const listRef = useRef<FlatList<Message>>(null);

  const showMessage = (
    title: string,
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setMessageModal({
      visible: true,
      title,
      message,
      type,
    });
  };

  async function loadWaitingChats() {
    if (!token) return;

    const res = await fetch(`${API_URL}/api/chat/waiting`, {
      method: "GET",
      headers: authH(token),
    });

    const { text, data } = await readResponse(res);

    if (!res.ok) {
      throw new Error(
        cleanError(text, `Failed to load waiting chats. Status ${res.status}`),
      );
    }

    setWaitingChats(normalizeChats(data));
  }

  async function loadMyChats() {
    if (!token) return;

    const res = await fetch(`${API_URL}/api/chat/my`, {
      method: "GET",
      headers: authH(token),
    });

    const { text, data } = await readResponse(res);

    if (!res.ok) {
      throw new Error(
        cleanError(text, `Failed to load my chats. Status ${res.status}`),
      );
    }

    setMyChats(normalizeChats(data));
  }

  async function loadChatById(chatId: string): Promise<Chat | null> {
    if (!token) return null;

    const res = await fetch(`${API_URL}/api/chat/${chatId}`, {
      method: "GET",
      headers: authH(token),
    });

    const { text, data } = await readResponse(res);

    if (!res.ok) {
      throw new Error(
        cleanError(text, `Failed to load chat. Status ${res.status}`),
      );
    }

    if (!data || isClosedChat(data)) return null;

    return data;
  }

  async function loadMessages(chatId: string, showError = true) {
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/chat/${chatId}/messages`, {
        method: "GET",
        headers: authH(token),
      });

      const { text, data } = await readResponse(res);

      if (!res.ok) {
        throw new Error(
          cleanError(text, `Failed to load messages. Status ${res.status}`),
        );
      }

      setMessages(normalizeMessages(data));

      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 120);
    } catch (e: any) {
      if (showError) {
        showMessage("Error", e?.message || "Failed to load messages.", "error");
      }
    }
  }

  async function loadAll() {
    if (authLoading) return;

    if (!token) {
      setWaitingChats([]);
      setMyChats([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      await Promise.all([loadWaitingChats(), loadMyChats()]);
    } catch (e: any) {
      showMessage(
        "Error",
        e?.message || "Failed to load support chats.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  async function takeChat(chat: Chat) {
    const chatId = getChatId(chat);

    if (!chatId || !token) return;

    try {
      setChatLoading(true);

      const res = await fetch(
        `${API_URL}/api/chat/take/${encodeURIComponent(chatId)}`,
        {
          method: "POST",
          headers: authH(token),
        },
      );

      const { text } = await readResponse(res);

      if (!res.ok) {
        throw new Error(
          cleanError(text, `Failed to take chat. Status ${res.status}`),
        );
      }

      const freshChat = await loadChatById(chatId);

      setActiveChat(freshChat ?? chat);
      await loadMessages(chatId);
      await loadAll();
    } catch (e: any) {
      showMessage("Error", e?.message || "Failed to take chat.", "error");
    } finally {
      setChatLoading(false);
    }
  }

  async function openChat(chat: Chat) {
    const chatId = getChatId(chat);

    if (!chatId) return;

    try {
      setChatLoading(true);

      const freshChat = await loadChatById(chatId);

      if (!freshChat) {
        await loadAll();
        showMessage("Closed", "This chat is already closed.", "error");
        return;
      }

      setActiveChat(freshChat);
      await loadMessages(chatId);
    } catch (e: any) {
      showMessage("Error", e?.message || "Failed to open chat.", "error");
    } finally {
      setChatLoading(false);
    }
  }

  async function exitChat() {
    setActiveChat(null);
    setMessages([]);
    setInput("");
    setCloseModal(false);

    await loadAll();
  }

  async function sendMessage() {
    const chatId = getChatId(activeChat);
    const text = input.trim();

    if (!chatId || !text || !token) return;

    try {
      setSending(true);
      setInput("");

      const optimistic: Message = {
        id: `admin-local-${Date.now()}`,
        text,
        senderId: activeChat?.adminId ?? userId ?? "admin",
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimistic]);

      const res = await fetch(`${API_URL}/api/chat/send-message`, {
        method: "POST",
        headers: authH(token),
        body: JSON.stringify({
          chatId,
          text,
        }),
      });

      const { text: responseText } = await readResponse(res);

      if (!res.ok) {
        throw new Error(
          cleanError(
            responseText,
            `Message was not sent. Status ${res.status}`,
          ),
        );
      }

      await loadMessages(chatId, false);
    } catch (e: any) {
      showMessage("Error", e?.message || "Message was not sent.", "error");
    } finally {
      setSending(false);
    }
  }

  async function closeChatTicket() {
    const chatId = getChatId(activeChat);

    if (!chatId || !token) return;

    try {
      const res = await fetch(
        `${API_URL}/api/chat/close/${encodeURIComponent(chatId)}`,
        {
          method: "POST",
          headers: authH(token),
        },
      );

      const { text } = await readResponse(res);

      if (!res.ok) {
        throw new Error(
          cleanError(text, `Failed to close chat. Status ${res.status}`),
        );
      }

      setCloseModal(false);
      setActiveChat(null);
      setMessages([]);
      setInput("");

      showMessage("Closed", "Support ticket was closed successfully.");
      await loadAll();
    } catch (e: any) {
      showMessage("Error", e?.message || "Failed to close ticket.", "error");
    }
  }

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    void loadAll();
  }, [token, authLoading]);

  useEffect(() => {
    const chatId = getChatId(activeChat);

    if (!chatId || !token) return;

    const interval = setInterval(() => {
      loadMessages(chatId, false);
    }, 3000);

    return () => clearInterval(interval);
  }, [activeChat, token]);

  const renderMessage = ({ item }: { item: Message }) => {
    const text = item.text ?? item.message ?? item.content ?? "";

    const isAdminMessage =
      (!!activeChat?.adminId && item.senderId === activeChat.adminId) ||
      (!activeChat?.adminId &&
        !!activeChat?.userId &&
        !!item.senderId &&
        item.senderId !== activeChat.userId) ||
      item.senderId === "admin";

    return (
      <View style={[s.msgRow, isAdminMessage ? s.msgRowMe : s.msgRowOther]}>
        {!isAdminMessage && (
          <View style={[s.customerIcon, { backgroundColor: theme.accentBg }]}>
            <Ionicons name="paw-outline" size={15} color={theme.accent} />
          </View>
        )}

        <View
          style={[
            s.msgBubble,
            {
              backgroundColor: isAdminMessage ? theme.accent : theme.bg3,
              borderColor: isAdminMessage ? theme.accent : theme.border,
            },
          ]}
        >
          <Text
            style={{
              color: isAdminMessage ? "white" : theme.text,
              lineHeight: 20,
            }}
          >
            {text}
          </Text>
        </View>
      </View>
    );
  };

  if (authLoading || loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={theme.accent} />
        <Text style={{ color: theme.text3, marginTop: 10 }}>
          Loading support chats...
        </Text>
      </View>
    );
  }

  if (!token) {
    return (
      <View style={s.center}>
        <Ionicons name="lock-closed-outline" size={38} color={theme.text3} />

        <Text style={[s.emptyTitle, { color: theme.text }]}>
          Please sign in again
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {!activeChat ? (
        <>
          <View style={s.topRow}>
            <View>
              <Text style={[s.title, { color: theme.text }]}>
                Support Chats
              </Text>

              <Text style={[s.sub, { color: theme.text3 }]}>
                Waiting: {waitingChats.length} · My chats: {myChats.length}
              </Text>
            </View>

            <TouchableOpacity
              style={[s.refreshBtn, { backgroundColor: theme.accentBg }]}
              onPress={loadAll}
            >
              <Ionicons name="refresh-outline" size={18} color={theme.accent} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={[
              { type: "section", title: "Waiting Chats" },
              ...waitingChats.map((chat) => ({
                type: "waiting",
                chat,
              })),
              { type: "section", title: "My Chats" },
              ...myChats.map((chat) => ({
                type: "my",
                chat,
              })),
            ]}
            keyExtractor={(item: any, index) => {
              if (item.type === "section") return `${item.title}-${index}`;
              return `${item.type}-${getChatId(item.chat)}-${index}`;
            }}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }: any) => {
              if (item.type === "section") {
                return (
                  <Text style={[s.sectionTitle, { color: theme.text2 }]}>
                    {item.title}
                  </Text>
                );
              }

              const chat: Chat = item.chat;
              const chatId = getChatId(chat);
              const user = getChatUser(chat);

              return (
                <View
                  style={[
                    s.chatCard,
                    {
                      backgroundColor: theme.bg2,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View
                    style={[s.catIcon, { backgroundColor: theme.accentBg }]}
                  >
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={20}
                      color={theme.accent}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[s.chatTitle, { color: theme.text }]}>
                      {user}
                    </Text>

                    <Text style={[s.chatSub, { color: theme.text3 }]}>
                      Chat #{chatId.slice(0, 8)}
                    </Text>
                  </View>

                  {item.type === "waiting" ? (
                    <TouchableOpacity
                      style={[s.takeBtn, { backgroundColor: theme.accent }]}
                      onPress={() => takeChat(chat)}
                      disabled={chatLoading}
                    >
                      <Text style={s.takeText}>Take</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[s.openBtn, { backgroundColor: theme.accentBg }]}
                      onPress={() => openChat(chat)}
                      disabled={chatLoading}
                    >
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={18}
                        color={theme.accent}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={s.center}>
                <Ionicons name="paw-outline" size={34} color={theme.accent} />

                <Text style={[s.emptyTitle, { color: theme.text }]}>
                  No support chats yet
                </Text>
              </View>
            }
          />
        </>
      ) : (
        <>
          <View style={s.chatHeader}>
            <TouchableOpacity
              style={[s.headerBtn, { backgroundColor: theme.accentBg }]}
              onPress={exitChat}
            >
              <Ionicons
                name="chevron-back-outline"
                size={22}
                color={theme.accent}
              />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={[s.title, { color: theme.text }]}>
                {getChatUser(activeChat)}
              </Text>

              <Text style={[s.sub, { color: theme.text3 }]}>
                Chat #{getChatId(activeChat).slice(0, 8)}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                s.headerBtn,
                { backgroundColor: "rgba(248,113,113,0.12)" },
              ]}
              onPress={() => setCloseModal(true)}
            >
              <Ionicons name="close-circle-outline" size={22} color="#f87171" />
            </TouchableOpacity>
          </View>

          {chatLoading ? (
            <View style={s.center}>
              <ActivityIndicator color={theme.accent} />
            </View>
          ) : (
            <>
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(item, index) => item.id || String(index)}
                renderItem={renderMessage}
                contentContainerStyle={s.messagesList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={s.center}>
                    <Ionicons
                      name="paw-outline"
                      size={34}
                      color={theme.accent}
                    />

                    <Text style={[s.emptyTitle, { color: theme.text }]}>
                      No messages yet
                    </Text>
                  </View>
                }
              />

              <View
                style={[
                  s.inputRow,
                  {
                    backgroundColor: theme.bg2,
                    borderColor: theme.border,
                  },
                ]}
              >
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  placeholder="Reply as support..."
                  placeholderTextColor={theme.text3}
                  style={[s.input, { color: theme.text }]}
                  multiline
                />

                <TouchableOpacity
                  style={[
                    s.sendBtn,
                    {
                      backgroundColor: input.trim() ? theme.accent : theme.bg3,
                    },
                  ]}
                  onPress={sendMessage}
                  disabled={sending || !input.trim()}
                >
                  <Ionicons
                    name={sending ? "hourglass-outline" : "send-outline"}
                    size={18}
                    color="white"
                  />
                </TouchableOpacity>
              </View>
            </>
          )}
        </>
      )}

      <Modal visible={closeModal} transparent animationType="fade">
        <View style={s.modalBg}>
          <View
            style={[
              s.modalBox,
              {
                backgroundColor: theme.bg2,
                borderColor: theme.border,
              },
            ]}
          >
            <View
              style={[
                s.modalIcon,
                {
                  backgroundColor: "rgba(248,113,113,0.12)",
                },
              ]}
            >
              <Ionicons name="close-circle-outline" size={32} color="#f87171" />
            </View>

            <Text style={[s.modalTitle, { color: theme.text }]}>
              Close this ticket?
            </Text>

            <Text style={[s.modalText, { color: theme.text2 }]}>
              This will close the support ticket. Use the back button if you
              only want to leave this chat.
            </Text>

            <View style={s.btns}>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: theme.bg3 }]}
                onPress={() => setCloseModal(false)}
              >
                <Text style={{ color: theme.text2, fontWeight: "700" }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.btn, { backgroundColor: "#ef4444" }]}
                onPress={closeChatTicket}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>
                  Close ticket
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={messageModal.visible} transparent animationType="fade">
        <View style={s.modalBg}>
          <View
            style={[
              s.modalBox,
              {
                backgroundColor: theme.bg2,
                borderColor: theme.border,
              },
            ]}
          >
            <View
              style={[
                s.modalIcon,
                {
                  backgroundColor:
                    messageModal.type === "success"
                      ? "rgba(34,197,94,0.12)"
                      : "rgba(248,113,113,0.12)",
                },
              ]}
            >
              <Ionicons
                name={
                  messageModal.type === "success"
                    ? "checkmark-circle-outline"
                    : "warning-outline"
                }
                size={32}
                color={messageModal.type === "success" ? "#22c55e" : "#f87171"}
              />
            </View>

            <Text style={[s.modalTitle, { color: theme.text }]}>
              {messageModal.title}
            </Text>

            <Text style={[s.modalText, { color: theme.text2 }]}>
              {messageModal.message}
            </Text>

            <TouchableOpacity
              style={[s.fullBtn, { backgroundColor: theme.accent }]}
              onPress={() =>
                setMessageModal((prev) => ({
                  ...prev,
                  visible: false,
                }))
              }
            >
              <Text style={{ color: "white", fontWeight: "700" }}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
  },

  sub: {
    fontSize: 12,
    marginTop: 3,
  },

  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 10,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },

  catIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  chatTitle: {
    fontSize: 14,
    fontWeight: "800",
  },

  chatSub: {
    fontSize: 11,
    marginTop: 2,
  },

  takeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },

  takeText: {
    color: "white",
    fontWeight: "800",
    fontSize: 12,
  },

  openBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },

  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  messagesList: {
    paddingVertical: 12,
    paddingBottom: 24,
  },

  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 10,
  },

  msgRowMe: {
    justifyContent: "flex-end",
  },

  msgRowOther: {
    justifyContent: "flex-start",
  },

  customerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },

  msgBubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },

  input: {
    flex: 1,
    maxHeight: 90,
    fontSize: 14,
    paddingVertical: 6,
  },

  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 8,
  },

  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  modalBox: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
  },

  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },

  modalText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  btns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    width: "100%",
  },

  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },

  fullBtn: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
});
