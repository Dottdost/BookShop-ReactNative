import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useNavigation } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function GlassHeader({ title }: { title: string }) {
  const navigation = useNavigation();

  return (
    <BlurView intensity={80} tint="dark" style={styles.container}>
      <View style={styles.inner}>
        <TouchableOpacity
          onPress={() => (navigation as any).openDrawer?.()}
          style={styles.iconBtn}
        >
          <Ionicons name="menu" size={26} color="white" />
        </TouchableOpacity>

        <Text style={styles.title}>{title}</Text>

        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="heart-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    width: "100%",
    height: 100,
    justifyContent: "flex-end",
    paddingBottom: 12,
    zIndex: 100,
  },

  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
