export function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export function slugify(str: string): string {
  const clean = removeVietnameseTones(str).toLowerCase().trim();
  return clean.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

export function generateProjectKey(name: string): string {
  const clean = removeVietnameseTones(name).trim();
  if (!clean) return "";
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 3) {
    return (words[0][0] + words[1][0] + words[2][0])
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
  }
  if (words.length === 2) {
    return (words[0][0] + words[1][0]).toUpperCase().replace(/[^A-Z0-9]/g, "");
  }
  return clean
    .slice(0, 3)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}
