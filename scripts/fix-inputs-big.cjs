const fs = require("fs");
const path = require("path");

const root = process.cwd();
const folders = ["app", "components"];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const files = [];

  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      files.push(...walk(full));
    } else if (full.endsWith(".tsx") || full.endsWith(".ts")) {
      files.push(full);
    }
  }

  return files;
}

function fixInputs(content) {
  let next = content;

  // Убираем эксперимент, который сделал input слишком маленьким.
  next = next.replace(/,\s*includeFontPadding:\s*false/g, "");

  // Нормальная высота обычных TextInput.
  next = next.replace(
    /input:\s*{\s*flex:\s*1,\s*fontSize:\s*(\d+),\s*paddingVertical:\s*\d+\s*}/g,
    "input: { flex: 1, fontSize: $1, paddingVertical: 14 }",
  );

  // Нормальная высота multiline/chat input.
  next = next.replace(
    /input:\s*{\s*flex:\s*1,\s*maxHeight:\s*(\d+),\s*fontSize:\s*(\d+),\s*paddingVertical:\s*\d+\s*}/g,
    "input: { flex: 1, maxHeight: $1, fontSize: $2, paddingVertical: 8 }",
  );

  // Inline input.
  next = next.replace(
    /style={{\s*color:\s*theme\.text,\s*flex:\s*1,\s*paddingVertical:\s*\d+\s*}}/g,
    "style={{ color: theme.text, flex: 1, paddingVertical: 14 }}",
  );

  // Если раньше добавили minHeight 46/52 — делаем нормальную высоту.
  next = next.replace(/minHeight:\s*\d+,/g, "minHeight: 56,");

  // Если minHeight вообще нет — добавляем в inputWrapper после borderWidth.
  next = next.replace(
    /(inputWrapper:\s*{\n(?:.*\n)*?\s*borderWidth:\s*1,\n)(?!\s*minHeight)/g,
    "$1    minHeight: 56,\n",
  );

  // Отступ от левого края нормальный, не огромный и не слишком маленький.
  next = next.replace(/paddingHorizontal:\s*\d+/g, (match) => {
    return match.includes("paddingHorizontal")
      ? "paddingHorizontal: 14"
      : match;
  });

  // Иконка не должна прилипать к тексту.
  next = next.replace(
    /inputIcon:\s*{\s*marginRight:\s*\d+\s*}/g,
    "inputIcon: { marginRight: 10 }",
  );

  return next;
}

const files = folders.flatMap((folder) => walk(path.join(root, folder)));

let changed = 0;

for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  const after = fixInputs(before);

  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    changed++;
    console.log("fixed:", path.relative(root, file));
  }
}

console.log(`Done. Changed files: ${changed}`);
