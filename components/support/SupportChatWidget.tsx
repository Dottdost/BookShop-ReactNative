import { useAuth } from "@/app/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import API_URL from "@/services/config/api";
import {
  joinChatGroup,
  leaveChatGroup,
  offReceiveMessage,
  onReceiveMessage,
} from "@/services/signalr";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  status?: string | number;
  createdAt?: string;
  closedAt?: string | null;
  messages?: any;
  user?: {
    id?: string;
    userName?: string;
    username?: string;
  };
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

  if (!text) return { text: "", data: null };

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
  return [];
}

function getChatId(chat: any): string {
  return String(chat?.id ?? chat?.chatId ?? "");
}

function isClosedChat(chat: any): boolean {
  const status = String(chat?.status ?? "").toLowerCase();
  return chat?.closedAt != null || status === "closed";
}

function normalizeMessages(data: any): Message[] {
  return unwrapArray(data)
    .filter((x) => x && !x.$ref)
    .map((m: any, index: number) => ({
      id: String(m.id ?? m.messageId ?? `${index}-${m.sentAt ?? Date.now()}`),
      text: m.text ?? m.message ?? m.content ?? "",
      senderId: m.senderId ?? "",
      userId: m.userId,
      createdAt: m.createdAt ?? m.sentAt ?? "",
    }));
}

function cleanError(text: string, fallback: string) {
  if (!text) return fallback;

  try {
    const json = JSON.parse(text);
    return json.title || json.message || fallback;
  } catch {
    return text || fallback;
  }
}

function pickActiveUserChat(data: any): Chat | null {
  const chats = unwrapArray(data).filter((x) => x && !x.$ref && getChatId(x));

  if (chats.length === 0) return null;

  const waitingChats = chats.filter((chat) => {
    const status = Number(chat?.status);
    return !isClosedChat(chat) && status === 1;
  });

  if (waitingChats.length === 0) return null;

  return waitingChats.sort(
    (a, b) =>
      new Date(b.createdAt ?? 0).getTime() -
      new Date(a.createdAt ?? 0).getTime(),
  )[0];
}

export default function SupportChatWidget() {
  const { theme } = useTheme();
  const { token, userId, isAdmin, isSuperAdmin } = useAuth();

  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const catFloat = useRef(new Animated.Value(0)).current;
  const listRef = useRef<FlatList<Message>>(null);

  const chatId = getChatId(chat);
  const isLoggedIn = !!token;

  const bubbleText = useMemo(() => {
    if (!isLoggedIn) return "Sign in to chat";
    return "Need help?";
  }, [isLoggedIn]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(catFloat, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(catFloat, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [catFloat]);

  useEffect(() => {
    if (!open || !chatId || !token || isAdmin || isSuperAdmin) return;

    const interval = setInterval(() => {
      loadMessages(chatId, false);
    }, 7000);

    return () => clearInterval(interval);
  }, [open, chatId, token, isAdmin, isSuperAdmin]);

  useEffect(() => {
    if (!open || !chatId || !token || isAdmin || isSuperAdmin) return;

    let mounted = true;

    async function connectSignalR() {
      try {
        await joinChatGroup(chatId);

        if (!mounted) return;

        await onReceiveMessage(() => {
          loadMessages(chatId, false);
        });

        console.log("SignalR joined chat:", chatId);
      } catch (e) {
        console.log("SignalR chat connection failed:", e);
      }
    }

    connectSignalR();

    return () => {
      mounted = false;

      offReceiveMessage().catch(() => {});
      leaveChatGroup(chatId).catch(() => {});
    };
  }, [open, chatId, token, isAdmin, isSuperAdmin]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  if (isAdmin || isSuperAdmin) {
    return null;
  }

  const translateY = catFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });

  async function getMyChat(): Promise<Chat | null> {
    if (!token) return null;

    const res = await fetch(`${API_URL}/api/chat/my`, {
      method: "GET",
      headers: authH(token),
    });

    const { text, data } = await readResponse(res);

    if (!res.ok) {
      throw new Error(cleanError(text, `Failed to load chat ${res.status}`));
    }

    return pickActiveUserChat(data);
  }

  async function createChat(): Promise<Chat> {
    if (!token) throw new Error("Token not found.");

    const res = await fetch(`${API_URL}/api/chat/create`, {
      method: "POST",
      headers: authH(token),
    });

    const { text, data } = await readResponse(res);

    if (!res.ok) {
      throw new Error(cleanError(text, `Failed to create chat ${res.status}`));
    }

    if (!getChatId(data)) {
      throw new Error("Created chat has no id.");
    }

    return data;
  }

  async function loadMessages(id: string, showError = true) {
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/chat/${id}/messages`, {
        method: "GET",
        headers: authH(token),
      });

      const { text, data } = await readResponse(res);

      if (!res.ok) {
        throw new Error(
          cleanError(text, `Failed to load messages ${res.status}`),
        );
      }

      setMessages(normalizeMessages(data));
    } catch (e: any) {
      if (showError) {
        setError(e?.message || "Failed to load messages.");
      }
    }
  }

  async function openChat() {
    if (!token) {
      setOpen(true);
      setError("Please sign in to use support chat.");
      return;
    }

    try {
      setOpen(true);
      setHidden(false);
      setLoading(true);
      setError("");

      let currentChat = await getMyChat();

      if (!currentChat) {
        currentChat = await createChat();
      }

      setChat(currentChat);

      const id = getChatId(currentChat);
      await loadMessages(id);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function closeChatWindow() {
    setOpen(false);
    setChat(null);
    setMessages([]);
    setInput("");
    setError("");
  }

  function hideWidget() {
    setHidden(true);
    setOpen(false);
  }

  async function sendMessage() {
    const text = input.trim();
    const id = getChatId(chat);

    if (!text || !id || !token) return;

    try {
      setSending(true);
      setInput("");
      setError("");

      const optimistic: Message = {
        id: `local-${Date.now()}`,
        text,
        senderId: chat?.userId ?? userId ?? "me",
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimistic]);

      const res = await fetch(`${API_URL}/api/chat/send-message`, {
        method: "POST",
        headers: authH(token),
        body: JSON.stringify({
          chatId: id,
          text,
        }),
      });

      const { text: responseText } = await readResponse(res);

      if (!res.ok) {
        throw new Error(cleanError(responseText, `Send failed ${res.status}`));
      }

      await loadMessages(id, false);
    } catch (e: any) {
      setError(e?.message || "Message was not sent.");
    } finally {
      setSending(false);
    }
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const messageText = item.text ?? item.message ?? item.content ?? "";

    const isMine =
      (!!chat?.userId && item.senderId === chat.userId) ||
      item.senderId === "me";

    return (
      <View
        style={[
          styles.messageRow,
          isMine ? styles.messageRowMe : styles.messageRowOther,
        ]}
      >
        {!isMine && (
          <View style={[styles.smallIcon, { backgroundColor: theme.accentBg }]}>
            <Ionicons name="paw-outline" size={15} color={theme.accent} />
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            {
              backgroundColor: isMine ? theme.accent : theme.bg3,
              borderColor: isMine ? theme.accent : theme.border,
            },
          ]}
        >
          <Text
            style={{
              color: isMine ? "white" : theme.text,
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            {messageText}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <>
      {hidden ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setHidden(false)}
          style={[
            styles.hiddenButton,
            {
              backgroundColor: theme.accent,
              borderColor: theme.border,
            },
          ]}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={22}
            color="white"
          />
        </TouchableOpacity>
      ) : (
        <Animated.View
          style={[
            styles.floatingWrap,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={openChat}
            style={[
              styles.catBubble,
              {
                backgroundColor: theme.bg2,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={[styles.catFace, { backgroundColor: theme.accentBg }]}>
              <Ionicons name="paw-outline" size={22} color={theme.accent} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.catTitle, { color: theme.text }]}>
                Cheshire Support
              </Text>

              <Text style={[styles.catText, { color: theme.text2 }]}>
                {bubbleText}
              </Text>
            </View>

            <TouchableOpacity
              onPress={hideWidget}
              hitSlop={10}
              style={styles.hideBtn}
            >
              <Ionicons
                name="chevron-forward-outline"
                size={17}
                color={theme.text3}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      )}

      <Modal visible={open} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalBg}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={[
              styles.chatBox,
              {
                backgroundColor: theme.bg2,
                borderColor: theme.border,
              },
            ]}
          >
            <View pointerEvents="none" style={styles.pawBg}>
              {Array.from({ length: 18 }).map((_, index) => (
                <Ionicons
                  key={index}
                  name="paw-outline"
                  size={index % 3 === 0 ? 24 : 18}
                  color={
                    theme.dark
                      ? "rgba(139,92,246,0.08)"
                      : "rgba(139,92,246,0.12)"
                  }
                  style={[
                    styles.bgPaw,
                    {
                      top: `${(index * 13) % 90}%`,
                      left: `${(index * 29) % 92}%`,
                      transform: [{ rotate: `${((index * 31) % 40) - 20}deg` }],
                    },
                  ]}
                />
              ))}
            </View>

            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View
                  style={[
                    styles.headerCat,
                    { backgroundColor: theme.accentBg },
                  ]}
                >
                  <Ionicons
                    name="chatbubbles-outline"
                    size={24}
                    color={theme.accent}
                  />
                </View>

                <View>
                  <Text style={[styles.headerTitle, { color: theme.text }]}>
                    Cheshire Support
                  </Text>

                  <Text style={[styles.headerSub, { color: theme.text3 }]}>
                    Ask anything about your order or books
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={closeChatWindow}>
                <Ionicons name="close-outline" size={26} color={theme.text2} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator color={theme.accent} />
                <Text style={{ color: theme.text3, marginTop: 10 }}>
                  Calling support...
                </Text>
              </View>
            ) : error ? (
              <View style={styles.center}>
                <Ionicons name="warning-outline" size={34} color="#f87171" />

                <Text
                  style={{
                    color: "#f87171",
                    textAlign: "center",
                    marginTop: 10,
                  }}
                >
                  {error}
                </Text>

                <TouchableOpacity
                  style={[styles.retryBtn, { backgroundColor: theme.accent }]}
                  onPress={openChat}
                >
                  <Text style={{ color: "white", fontWeight: "700" }}>
                    Try again
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <FlatList
                  ref={listRef}
                  data={messages}
                  keyExtractor={(item, index) => item.id || String(index)}
                  renderItem={renderMessage}
                  contentContainerStyle={styles.messagesList}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.emptyBox}>
                      <Ionicons
                        name="paw-outline"
                        size={42}
                        color={theme.accent}
                      />

                      <Text style={[styles.emptyTitle, { color: theme.text }]}>
                        No messages yet
                      </Text>

                      <Text style={[styles.emptyText, { color: theme.text3 }]}>
                        Start the conversation with our support team.
                      </Text>
                    </View>
                  }
                />

                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: theme.bg,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <TextInput
                    value={input}
                    onChangeText={setInput}
                    placeholder="Type your message..."
                    placeholderTextColor={theme.text3}
                    style={[styles.input, { color: theme.text }]}
                    multiline
                  />

                  <TouchableOpacity
                    onPress={sendMessage}
                    disabled={sending || !input.trim()}
                    style={[
                      styles.sendBtn,
                      {
                        backgroundColor: input.trim()
                          ? theme.accent
                          : theme.bg3,
                      },
                    ]}
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
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingWrap: {
    position: "absolute",
    right: -6,
    bottom: 78,
    zIndex: 999,
  },

  hiddenButton: {
    position: "absolute",
    right: 14,
    bottom: 84,
    zIndex: 999,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  catBubble: {
    width: 236,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderRadius: 22,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 9,
  },

  catFace: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },

  catTitle: {
    fontSize: 13,
    fontWeight: "800",
  },

  catText: {
    fontSize: 11,
    marginTop: 1,
  },

  hideBtn: {
    width: 24,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },

  chatBox: {
    height: "78%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 16,
    overflow: "hidden",
  },

  pawBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 1,
  },

  bgPaw: {
    position: "absolute",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    zIndex: 2,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  headerCat: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
  },

  headerSub: {
    fontSize: 11,
    marginTop: 2,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    zIndex: 2,
  },

  messagesList: {
    paddingVertical: 10,
    gap: 10,
    zIndex: 2,
  },

  messageRow: {
    flexDirection: "row",
    marginBottom: 10,
    alignItems: "flex-end",
    zIndex: 2,
  },

  messageRowMe: {
    justifyContent: "flex-end",
  },

  messageRowOther: {
    justifyContent: "flex-start",
  },

  smallIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },

  messageBubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },

  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    zIndex: 2,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 8,
  },

  emptyText: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    zIndex: 2,
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

  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
});
