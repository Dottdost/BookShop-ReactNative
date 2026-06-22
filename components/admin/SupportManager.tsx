import API_URL from "@/.expo/config/api";
import { useAuth } from "@/app/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
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
  userName?: string;
  username?: string;
  status?: string;
  createdAt?: string;
  messages?: any;
};

type Message = {
  id?: string;
  text?: string;
  message?: string;
  content?: string;
  senderId?: string;
  userId?: string;
  senderName?: string;
  userName?: string;
  username?: string;
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
    return { text: "", data: null };
  }

  try {
    return { text, data: JSON.parse(text) };
  } catch {
    return { text, data: null };
  }
}

function unwrapArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.$values)) return data.$values;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.$values)) return data.data.$values;
  if (Array.isArray(data?.messages)) return data.messages;
  if (Array.isArray(data?.messages?.$values)) return data.messages.$values;
  if (Array.isArray(data?.data?.messages)) return data.data.messages;
  if (Array.isArray(data?.data?.messages?.$values)) {
    return data.data.messages.$values;
  }

  return [];
}

function getChatId(chat: any): string {
  return String(
    chat?.chatId ?? chat?.id ?? chat?.data?.chatId ?? chat?.data?.id ?? "",
  );
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

function normalizeMessages(data: any): Message[] {
  return unwrapArray(data).map((m: any, index: number) => ({
    id: String(m.id ?? m.messageId ?? `${index}-${m.createdAt ?? Date.now()}`),
    text: m.text ?? m.message ?? m.content ?? "",
    senderId: m.senderId ?? m.userId ?? m.senderUserId ?? "",
    userId: m.userId,
    senderName: m.senderName ?? m.userName ?? m.username ?? "",
    createdAt: m.createdAt ?? m.sentAt ?? m.date ?? "",
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

    return json.title || json.message || text;
  } catch {
    return text;
  }
}

export default function SupportManager() {
  const { theme } = useTheme();
  const { token, userId, username } = useAuth();

  const [waitingChats, setWaitingChats] = useState<Chat[]>([]);
  const [myChats, setMyChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [messageModal, setMessageModal] = useState({
    visible: false,
    title: "",
    message: "",
    type: "success" as "success" | "error",
  });

  const [closeModal, setCloseModal] = useState(false);

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

  const loadWaitingChats = async () => {
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

    setWaitingChats(unwrapArray(data));
  };

  const loadMyChats = async () => {
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

    setMyChats(unwrapArray(data));
  };

  const loadAll = async () => {
    try {
      setLoading(true);

      if (!token) {
        showMessage(
          "Unauthorized",
          "Token not found. Please sign in again.",
          "error",
        );
        return;
      }

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
  };

  const loadMessages = async (chatId: string, showErr = true) => {
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
      if (showErr) {
        showMessage("Error", e?.message || "Failed to load messages.", "error");
      }
    }
  };

  const takeChat = async (chat: Chat) => {
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

      setActiveChat(chat);
      await loadMessages(chatId);
      await loadAll();
    } catch (e: any) {
      showMessage("Error", e?.message || "Failed to take chat.", "error");
    } finally {
      setChatLoading(false);
    }
  };

  const openChat = async (chat: Chat) => {
    const chatId = getChatId(chat);
    if (!chatId) return;

    try {
      setChatLoading(true);
      setActiveChat(chat);
      await loadMessages(chatId);
    } finally {
      setChatLoading(false);
    }
  };

  const sendMessage = async () => {
    const chatId = getChatId(activeChat);
    const text = input.trim();

    if (!chatId || !text || !token) return;

    try {
      setSending(true);
      setInput("");

      const optimistic: Message = {
        id: `admin-local-${Date.now()}`,
        text,
        senderId: userId ?? username ?? "admin",
        senderName: username ?? "Admin",
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
          cleanError(responseText, `Send failed. Status ${res.status}`),
        );
      }

      await loadMessages(chatId, false);
    } catch (e: any) {
      showMessage("Error", e?.message || "Message was not sent.", "error");
    } finally {
      setSending(false);
    }
  };

  const closeChat = async () => {
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
        throw new Error(cleanError(text, `Close failed. Status ${res.status}`));
      }

      setCloseModal(false);
      setActiveChat(null);
      setMessages([]);
      showMessage("Closed", "Chat closed successfully.");
      await loadAll();
    } catch (e: any) {
      showMessage("Error", e?.message || "Failed to close chat.", "error");
    }
  };

  useEffect(() => {
    loadAll();
  }, [token]);

  useEffect(() => {
    if (!activeChat) return;

    const chatId = getChatId(activeChat);
    if (!chatId) return;

    const interval = setInterval(() => {
      loadMessages(chatId, false);
    }, 3000);

    return () => clearInterval(interval);
  }, [activeChat?.id, activeChat?.chatId, token]);

  const renderMessage = ({ item }: { item: Message }) => {
    const text = item.text ?? item.message ?? item.content ?? "";

    const isAdminMessage =
      item.senderId === userId ||
      item.userId === userId ||
      item.senderName === username ||
      item.userName === username ||
      item.username === username ||
      item.senderName?.toLowerCase?.().includes("admin") ||
      item.senderId === "admin";

    return (
      <View style={[s.msgRow, isAdminMessage ? s.msgRowMe : s.msgRowOther]}>
        {!isAdminMessage && (
          <View style={[s.customerIcon, { backgroundColor: theme.accentBg }]}>
            <Text style={{ fontSize: 15 }}>🐾</Text>
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

          {loading ? (
            <View style={s.center}>
              <ActivityIndicator color={theme.accent} />
              <Text style={{ color: theme.text3, marginTop: 10 }}>
                Loading support chats...
              </Text>
            </View>
          ) : (
            <FlatList
              data={[
                { type: "section", title: "Waiting Chats" },
                ...waitingChats.map((x) => ({ type: "waiting", chat: x })),
                { type: "section", title: "My Chats" },
                ...myChats.map((x) => ({ type: "my", chat: x })),
              ]}
              keyExtractor={(item: any, index) =>
                item.type === "section"
                  ? `${item.title}-${index}`
                  : `${item.type}-${getChatId(item.chat)}-${index}`
              }
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item }: any) => {
                if (item.type === "section") {
                  return (
                    <Text style={[s.sectionTitle, { color: theme.text2 }]}>
                      {item.title}
                    </Text>
                  );
                }

                const chat = item.chat;
                const chatId = getChatId(chat);
                const user = getChatUser(chat);

                return (
                  <View
                    style={[
                      s.chatCard,
                      { backgroundColor: theme.bg2, borderColor: theme.border },
                    ]}
                  >
                    <View
                      style={[s.catIcon, { backgroundColor: theme.accentBg }]}
                    >
                      <Text style={{ fontSize: 20 }}>🐈‍⬛</Text>
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
                  <Text style={{ fontSize: 34 }}>🐾</Text>
                  <Text style={[s.emptyTitle, { color: theme.text }]}>
                    No support chats yet
                  </Text>
                </View>
              }
            />
          )}
        </>
      ) : (
        <>
          <View style={s.chatHeader}>
            <TouchableOpacity
              style={[s.backBtn, { backgroundColor: theme.accentBg }]}
              onPress={() => {
                setActiveChat(null);
                setMessages([]);
              }}
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
                s.closeBtn,
                { backgroundColor: "rgba(248,113,113,0.12)" },
              ]}
              onPress={() => setCloseModal(true)}
            >
              <Ionicons name="close-circle-outline" size={21} color="#f87171" />
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
                    <Text style={{ fontSize: 34 }}>🐈‍⬛</Text>
                    <Text style={[s.emptyTitle, { color: theme.text }]}>
                      No messages yet
                    </Text>
                  </View>
                }
              />

              <View
                style={[
                  s.inputRow,
                  { backgroundColor: theme.bg2, borderColor: theme.border },
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
              { backgroundColor: theme.bg2, borderColor: theme.border },
            ]}
          >
            <View
              style={[
                s.modalIcon,
                { backgroundColor: "rgba(248,113,113,0.12)" },
              ]}
            >
              <Ionicons name="close-circle-outline" size={32} color="#f87171" />
            </View>

            <Text style={[s.modalTitle, { color: theme.text }]}>
              Close chat?
            </Text>

            <Text style={[s.modalText, { color: theme.text2 }]}>
              This support chat will be closed.
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
                onPress={closeChat}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>Close</Text>
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
              { backgroundColor: theme.bg2, borderColor: theme.border },
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
                setMessageModal((prev) => ({ ...prev, visible: false }))
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
    paddingHorizontal: 16,
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

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  closeBtn: {
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
    paddingHorizontal: 12,
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
