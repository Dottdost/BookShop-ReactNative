import API_URL from "@/.expo/config/api";
import * as signalR from "@microsoft/signalr";

let chatConnection: signalR.HubConnection | null = null;
let orderConnection: signalR.HubConnection | null = null;

function getToken() {
  if (typeof localStorage === "undefined") return null;

  return localStorage.getItem("accessToken") || localStorage.getItem("token");
}

/* =========================
   CHAT HUB
========================= */

export async function getChatSignalRConnection() {
  const token = getToken();

  if (!token) {
    throw new Error("SignalR token not found.");
  }

  if (chatConnection?.state === signalR.HubConnectionState.Connected) {
    return chatConnection;
  }

  chatConnection = new signalR.HubConnectionBuilder()
    .withUrl(`${API_URL}/chatHub`, {
      accessTokenFactory: () => token,
    })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Information)
    .build();

  chatConnection.onreconnecting(() => {
    console.log("Chat SignalR reconnecting...");
  });

  chatConnection.onreconnected(() => {
    console.log("Chat SignalR reconnected.");
  });

  chatConnection.onclose((error) => {
    console.log("Chat SignalR closed.", error);
  });

  console.log("Trying to connect Chat SignalR:", `${API_URL}/chatHub`);

  await chatConnection.start();

  console.log("Chat SignalR connected to /chatHub.");

  return chatConnection;
}

export async function joinChatGroup(chatId: string) {
  const hub = await getChatSignalRConnection();

  if (hub.state !== signalR.HubConnectionState.Connected) return;

  await hub.invoke("JoinChat", chatId);
}

export async function leaveChatGroup(chatId: string) {
  if (!chatConnection) return;
  if (chatConnection.state !== signalR.HubConnectionState.Connected) return;

  await chatConnection.invoke("LeaveChat", chatId);
}

export async function listenChatMessages(callback: (...args: any[]) => void) {
  const hub = await getChatSignalRConnection();

  hub.off("ReceiveMessage");
  hub.on("ReceiveMessage", (...args: any[]) => {
    console.log("CHAT SIGNALR RECEIVED:", args);
    callback(...args);
  });
}

export function removeChatMessageListener() {
  if (!chatConnection) return;

  chatConnection.off("ReceiveMessage");
}

/* =========================
   ORDER HUB
========================= */

export async function getOrderSignalRConnection() {
  if (orderConnection?.state === signalR.HubConnectionState.Connected) {
    return orderConnection;
  }

  const token = getToken();

  orderConnection = new signalR.HubConnectionBuilder()
    .withUrl(`${API_URL}/orderHub`, {
      accessTokenFactory: () => token ?? "",
    })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Information)
    .build();

  orderConnection.onreconnecting(() => {
    console.log("Order SignalR reconnecting...");
  });

  orderConnection.onreconnected(() => {
    console.log("Order SignalR reconnected.");
  });

  orderConnection.onclose((error) => {
    console.log("Order SignalR closed.", error);
  });

  console.log("Trying to connect Order SignalR:", `${API_URL}/orderHub`);

  await orderConnection.start();

  console.log("Order SignalR connected to /orderHub.");

  return orderConnection;
}

export async function listenOrderStatus(callback: (...args: any[]) => void) {
  console.log("listenOrderStatus called.");

  const hub = await getOrderSignalRConnection();

  console.log("Order listener registered.");

  const handler = (...args: any[]) => {
    console.log("ORDER SIGNALR RECEIVED:", args);
    callback(...args);
  };

  hub.off("OrderStatusChanged");
  hub.off("OrderStatusUpdated");
  hub.off("OrderUpdated");
  hub.off("ReceiveOrderStatusChanged");

  hub.on("OrderStatusChanged", handler);
  hub.on("OrderStatusUpdated", handler);
  hub.on("OrderUpdated", handler);
  hub.on("ReceiveOrderStatusChanged", handler);
}

export function removeOrderStatusListener() {
  if (!orderConnection) return;

  orderConnection.off("OrderStatusChanged");
  orderConnection.off("OrderStatusUpdated");
  orderConnection.off("OrderUpdated");
  orderConnection.off("ReceiveOrderStatusChanged");
}

export async function stopSignalRConnections() {
  if (chatConnection) {
    await chatConnection.stop();
    chatConnection = null;
  }

  if (orderConnection) {
    await orderConnection.stop();
    orderConnection = null;
  }
}
