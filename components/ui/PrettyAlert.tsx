import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type PrettyAlertType = "success" | "error" | "warning" | "info";

type PrettyAlertProps = {
  visible: boolean;
  title: string;
  message: string;
  type?: PrettyAlertType;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onClose: () => void;
  onConfirm?: () => void;
};

function getIcon(type: PrettyAlertType) {
  if (type === "success") return "checkmark-circle-outline";
  if (type === "warning") return "warning-outline";
  if (type === "info") return "information-circle-outline";
  return "alert-circle-outline";
}

function getColor(type: PrettyAlertType) {
  if (type === "success") return "#22c55e";
  if (type === "warning") return "#f59e0b";
  if (type === "info") return "#3b82f6";
  return "#f87171";
}

export default function PrettyAlert({
  visible,
  title,
  message,
  type = "info",
  confirmText = "Okay",
  cancelText = "Cancel",
  showCancel = false,
  onClose,
  onConfirm,
}: PrettyAlertProps) {
  const { theme } = useTheme();

  const color = getColor(type);

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
      return;
    }

    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <View
          style={[
            s.box,
            {
              backgroundColor: theme.bg2,
              borderColor: theme.border,
            },
          ]}
        >
          <View
            style={[
              s.iconCircle,
              {
                backgroundColor: `${color}22`,
              },
            ]}
          >
            <Ionicons name={getIcon(type)} size={34} color={color} />
          </View>

          <Text style={[s.title, { color: theme.text }]}>{title}</Text>

          {!!message && (
            <Text style={[s.message, { color: theme.text2 }]}>{message}</Text>
          )}

          {showCancel ? (
            <View style={s.row}>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: theme.bg3 }]}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Text style={[s.cancelText, { color: theme.text2 }]}>
                  {cancelText}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.btn, { backgroundColor: color }]}
                onPress={handleConfirm}
                activeOpacity={0.85}
              >
                <Text style={s.confirmText}>{confirmText}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[s.fullBtn, { backgroundColor: theme.accent }]}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <Text style={s.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  box: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 26,
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
  },

  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },

  title: {
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },

  message: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },

  row: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 20,
  },

  btn: {
    flex: 1,
    minHeight: 50,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  fullBtn: {
    width: "100%",
    minHeight: 50,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },

  confirmText: {
    color: "white",
    fontWeight: "900",
    fontSize: 15,
  },

  cancelText: {
    fontWeight: "800",
    fontSize: 15,
  },
});
