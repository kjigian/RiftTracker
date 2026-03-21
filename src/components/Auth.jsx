import { useState } from "react"
import { signIn, signUp } from "../lib/supabase"

const S = {
  bg: "#0a0a1a",
  card: "#12122a",
  border: "#1e1e3a",
  accent: "#6c5ce7",
  text: "#a0a0c0",
  dim: "#555580",
  green: "#00d68f",
}

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState("login") // login | signup
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState("")

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    if (mode === "signup") {
      const { data, error: err } = await signUp(email, password, name)
      if (err) {
        setError(err.message)
      } else {
        setSuccess("Check your email to confirm your account, then log in.")
        setMode("login")
      }
    } else {
      const { data, error: err } = await signIn(email, password)
      if (err) {
        setError(err.message)
      } else if (data?.user) {
        onAuth(data.user)
      }
    }
    setLoading(false)
  }

  const inputStyle = {
    width: "100%", padding: "10px 12px", background: S.bg,
    border: `1px solid ${S.border}`, borderRadius: 6, color: "#fff",
    fontSize: 13, fontFamily: "inherit", outline: "none",
  }

  const btnStyle = {
    width: "100%", padding: "11px", background: S.accent, color: "#fff",
    border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600,
    cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1,
    fontFamily: "inherit",
  }

  return (
    <div style={{
      minHeight: "100vh", background: S.bg, display: "flex",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{
        background: S.card, border: `1px solid ${S.border}`, borderRadius: 12,
        padding: 32, width: 360, maxWidth: "90vw",
      }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 9, letterSpacing: 4, color: S.accent, textTransform: "uppercase", fontWeight: 600 }}>
            Riftbound TCG
          </div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 700, color: "#fff", marginTop: 4 }}>
            Card Sorter Hub
          </div>
          <div style={{ fontSize: 11, color: S.dim, marginTop: 8 }}>
            {mode === "login" ? "Sign in to your collection" : "Create your account"}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "signup" && (
            <input
              type="text" placeholder="Display name" value={name}
              onChange={e => setName(e.target.value)}
              style={inputStyle}
            />
          )}
          <input
            type="email" placeholder="Email" value={email} required
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password" placeholder="Password" value={password} required minLength={6}
            onChange={e => setPassword(e.target.value)}
            style={inputStyle}
          />

          {error && (
            <div style={{ fontSize: 11, color: "#ff6b6b", padding: "8px 10px", background: "#ff6b6b11", borderRadius: 6 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ fontSize: 11, color: S.green, padding: "8px 10px", background: `${S.green}11`, borderRadius: 6 }}>
              {success}
            </div>
          )}

          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: S.dim }}>
          {mode === "login" ? (
            <>Don't have an account?{" "}
              <span onClick={() => { setMode("signup"); setError(""); setSuccess("") }}
                style={{ color: S.accent, cursor: "pointer" }}>Sign up</span>
            </>
          ) : (
            <>Already have an account?{" "}
              <span onClick={() => { setMode("login"); setError(""); setSuccess("") }}
                style={{ color: S.accent, cursor: "pointer" }}>Sign in</span>
            </>
          )}
        </div>

        <div style={{
          marginTop: 20, paddingTop: 16, borderTop: `1px solid ${S.border}`,
          fontSize: 10, color: S.dim, textAlign: "center", lineHeight: 1.6,
        }}>
          Each account gets its own collection tracker.<br />
          Scanned cards sync to your personal library.
        </div>
      </div>
    </div>
  )
}
