import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/auth-api/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        navigate("/login"); // redirection vers Login
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
        <h2 style={{ textAlign: "center", marginBottom: "20px", color: "#111827" }}>Inscription</h2>
        {message && <p style={{ color: "red", textAlign: "center" }}>{message}</p>}
        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column" }}>
          <input
            type="text"
            placeholder="Nom d'utilisateur"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ padding: "10px", marginBottom: "15px", borderRadius: "5px", border: "1px solid #d1d5db" }}
          />
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
            S'inscrire
          </button>
        </form>

        {/* Bouton vers Login */}
        <button
          onClick={() => navigate("/login")}
          style={{
            padding: "10px", backgroundColor: "#10b981", color: "#fff",
            border: "none", borderRadius: "5px", cursor: "pointer",
            fontWeight: "bold", width: "100%"
          }}
        >
          Aller à la connexion
        </button>
      </div>
    </div>
  );
}
