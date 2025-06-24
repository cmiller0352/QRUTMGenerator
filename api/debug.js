export default function handler(req, res) {
  console.log("✅ HIT /api/debug");
  res.status(200).json({ message: "API is working" });
}
