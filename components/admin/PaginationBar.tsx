import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  loading?: boolean;
  accent: string;
  accentBg: string;
  bg: string;
  bg2: string;
  border: string;
  text: string;
  text2: string;
  onPageChange: (page: number) => void;
};

export default function PaginationBar({
  page,
  totalPages,
  totalCount,
  pageSize,
  loading = false,
  accent,
  accentBg,
  bg,
  bg2,
  border,
  text,
  text2,
  onPageChange,
}: Props) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safePage = Math.min(Math.max(1, page || 1), safeTotalPages);

  const start = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalCount);

  const pages = Array.from(
    { length: safeTotalPages },
    (_, index) => index + 1,
  ).filter((item) => {
    if (safeTotalPages <= 5) return true;
    if (item === 1 || item === safeTotalPages) return true;
    return Math.abs(item - safePage) <= 1;
  });

  const goPrev = () => {
    if (safePage > 1 && !loading) {
      onPageChange(safePage - 1);
    }
  };

  const goNext = () => {
    if (safePage < safeTotalPages && !loading) {
      onPageChange(safePage + 1);
    }
  };

  return (
    <View style={[s.wrap, { backgroundColor: bg2, borderColor: border }]}>
      <Text style={[s.info, { color: text2 }]}>
        {totalCount === 0
          ? "No items"
          : `${start}-${end} of ${totalCount} · Page ${safePage}/${safeTotalPages}`}
      </Text>

      <View style={s.controls}>
        <TouchableOpacity
          disabled={safePage <= 1 || loading}
          style={[
            s.navBtn,
            {
              backgroundColor: safePage <= 1 || loading ? bg : accentBg,
              borderColor: border,
              opacity: safePage <= 1 || loading ? 0.45 : 1,
            },
          ]}
          onPress={goPrev}
        >
          <Ionicons name="chevron-back-outline" size={16} color={accent} />
        </TouchableOpacity>

        {pages.map((item, index) => {
          const previous = pages[index - 1];
          const shouldShowDots = previous && item - previous > 1;
          const active = item === safePage;

          return (
            <View key={item} style={s.pageGroup}>
              {shouldShowDots && (
                <Text style={[s.dots, { color: text2 }]}>...</Text>
              )}

              <TouchableOpacity
                disabled={loading}
                style={[
                  s.pageBtn,
                  {
                    backgroundColor: active ? accent : bg,
                    borderColor: active ? accent : border,
                  },
                ]}
                onPress={() => onPageChange(item)}
              >
                <Text style={[s.pageText, { color: active ? "white" : text }]}>
                  {item}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <TouchableOpacity
          disabled={safePage >= safeTotalPages || loading}
          style={[
            s.navBtn,
            {
              backgroundColor:
                safePage >= safeTotalPages || loading ? bg : accentBg,
              borderColor: border,
              opacity: safePage >= safeTotalPages || loading ? 0.45 : 1,
            },
          ]}
          onPress={goNext}
        >
          <Ionicons name="chevron-forward-outline" size={16} color={accent} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 10,
    marginTop: 10,
    marginBottom: 18,
    gap: 10,
  },

  info: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },

  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
  },

  pageGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  pageBtn: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  pageText: {
    fontSize: 12,
    fontWeight: "900",
  },

  dots: {
    fontSize: 12,
    fontWeight: "900",
  },
});
