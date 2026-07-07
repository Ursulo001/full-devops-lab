import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/auth-api/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        navigate("/tasks"); // redirection vers Tasks
      } else {
        setMessage(data.msg);
      }
    } catch (err) {
      setMessage("Erreur : " + err.message);
    }
  };

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      height: "100vh", backgroundColor: "#f5f7fa", fontFamily: "Arial, sans-serif"
    }}>
      <div style={{
        backgroundColor: "#fff", padding: "40px", borderRadius: "10px",
        boxShadow: "0 4px 10px rgba(0,0,0,0.1)", width: "350px"
      }}>
        <h2 style={{ textAlign: "center", marginBottom: "20px", color: "#111827" }}>Connexion</h2>
        {message && <p style={{ color: "red", textAlign: "center" }}>{message}</p>}
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column" }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: "10px", marginBottom: "15px", borderRadius: "5px", border: "1px solid #d1d5db" }}
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: "10px", marginBottom: "20px", borderRadius: "5px", border: "1px solid #d1d5db" }}
          />
          <button type="submit" style={{
            padding: "10px", backgroundColor: "#4f46e5", color: "#fff",
            border: "none", borderRadius: "5px", cursor: "pointer",
            fontWeight: "bold", marginBottom: "10px"
          }}>
            Se connecter
          </button>
        </form>

        {/* Bouton vers Register */}
        <button
          onClick={() => navigate("/register")}
          style={{
            padding: "10px", backgroundColor: "#10b981", color: "#fff",
            border: "none", borderRadius: "5px", cursor: "pointer",
            fontWeight: "bold", width: "100%"
          }}
        >
          Aller à l'inscription Stage frontend feature
        </button>
      </div>
    </div>
  );
}
