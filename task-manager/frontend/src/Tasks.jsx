import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // create | edit
  const [currentTask, setCurrentTask] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [user, setUser] = useState(null);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  
  const fetchUser = async () => {
    try {
      const res = await fetch("/auth-api/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Récupération des tâches
  const fetchTasks = async () => {
    try {
      const res = await fetch("/task-api/api/tasks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTasks(data.tasks);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!token) navigate("/login");
    else {
      fetchUser();
      fetchTasks();
    }
  }, []);

  // Déconnexion
  const handleLogout = () => {
    if (window.confirm("Voulez-vous vraiment vous déconnecter ?")) {
      localStorage.removeItem("token");
      navigate("/login");
    }
  };

  // Ouvrir le modal
  const openModal = (mode, task = null) => {
    setModalMode(mode);
    if (mode === "edit" && task) {
      setCurrentTask(task);
      setTitle(task.title);
      setDescription(task.description);
    } else {
      setCurrentTask(null);
      setTitle("");
      setDescription("");
    }
    setShowModal(true);
  };

  // Fermer modal
  const closeModal = () => {
    setShowModal(false);
    setCurrentTask(null);
    setTitle("");
    setDescription("");
  };

  // Créer ou Modifier une tâche
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (modalMode === "create") {
        res = await fetch("/task-api/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title, description }),
        });
      } else if (modalMode === "edit" && currentTask) {
        res = await fetch(`/task-api/api/tasks/${currentTask.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title, description }),
        });
      }
      if (res.ok) {
        fetchTasks();
        closeModal();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Supprimer tâche
  const handleDeleteTask = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette tâche ?")) return;
    try {
      const res = await fetch(`/task-api/api/tasks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  // Terminer tâche
  const handleFinishTask = async (task) => {
    if (task.status === "completed") return;
    if (!window.confirm("⚠️ Êtes-vous sûr de vouloir marquer cette tâche comme terminée ? Cette action est irréversible.")) return;
    try {
      const res = await fetch(`/task-api/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "completed" }),
      });
      if (res.ok) fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  // Couleur du badge selon le statut
  const getStatusStyle = (status) => {
    switch (status) {
      case "pending": return { backgroundColor: "#facc15", color: "#78350f" };
      case "in_progress": return { backgroundColor: "#3b82f6", color: "white" };
      case "completed": return { backgroundColor: "#22c55e", color: "white" };
      default: return { backgroundColor: "#9ca3af", color: "white" };
    }
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Poppins, sans-serif", backgroundColor: "#f3f4f6", minHeight: "100vh" }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", paddingBottom: "20px", borderBottom: "2px solid #e5e7eb" }}>
        <div>
          <h1 style={{ color: "#111827", fontWeight: "bold", fontSize: "28px", margin: 0 }}>🗂️ Gestion des Tâches</h1>
          {user && <p style={{ color: "#4b5563", marginTop: "5px" }}>Connecté en tant que <strong>{user.username}</strong> 👋</p>}
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => openModal("create")} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #4f46e5, #6366f1)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>➕ Nouvelle tâche</button>
          <button onClick={handleLogout} style={{ padding: "10px 20px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>🚪 Déconnexion</button>
        </div>
      </div>

      {/* LISTE DES TÂCHES */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
        {tasks.length === 0 ? (
          <p style={{ color: "#6b7280" }}>Aucune tâche trouvée.</p>
        ) : (
          tasks.map(task => (
            <div key={task.id} style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", borderLeft: `6px solid ${task.status === "completed" ? "#22c55e" : task.status === "in_progress" ? "#3b82f6" : "#facc15"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <h3 style={{ margin: 0, color: "#111827" }}>{task.title}</h3>
                <span style={{ ...getStatusStyle(task.status), padding: "4px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", textTransform: "capitalize" }}>{task.status.replace("_", " ")}</span>
              </div>
              <p style={{ margin: "5px 0", color: "#374151" }}>{task.description}</p>
              <p style={{ margin: "5px 0", fontSize: "12px", color: "#6b7280" }}>🕒 Créé le: {new Date(task.created_at).toLocaleString()}</p>

              {/* Boutons actions */}
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button onClick={() => openModal("edit", task)} style={{ flex: 1, padding: "8px", borderRadius: "5px", backgroundColor: "#3b82f6", color: "#fff", border: "none", cursor: task.status === "completed" ? "not-allowed" : "pointer" }} disabled={task.status === "completed"}>✏️ Modifier</button>
                <button onClick={() => handleFinishTask(task)} style={{ flex: 1, padding: "8px", borderRadius: "5px", backgroundColor: "#22c55e", color: "#fff", border: "none", cursor: task.status === "completed" ? "not-allowed" : "pointer" }} disabled={task.status === "completed"}>✅ Terminer</button>
                <button onClick={() => handleDeleteTask(task.id)} style={{ flex: 1, padding: "8px", borderRadius: "5px", backgroundColor: "#ef4444", color: "#fff", border: "none", cursor: "pointer" }}>🗑️ Supprimer</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL Création / Modification */}
      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ backgroundColor: "#fff", padding: "30px", borderRadius: "10px", width: "400px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
            <h2 style={{ marginBottom: "20px", color: "#111827" }}>{modalMode === "create" ? "Créer une nouvelle tâche" : "Modifier la tâche"}</h2>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column" }}>
              <input type="text" placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ padding: "10px", marginBottom: "15px", borderRadius: "5px", border: "1px solid #d1d5db" }} />
              <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} required style={{ padding: "10px", marginBottom: "15px", borderRadius: "5px", border: "1px solid #d1d5db" }} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" onClick={closeModal} style={{ padding: "10px 15px", backgroundColor: "#ef4444", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>Annuler</button>
                <button type="submit" style={{ padding: "10px 15px", backgroundColor: modalMode === "create" ? "#4f46e5" : "#3b82f6", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>{modalMode === "create" ? "Créer" : "Mettre à jour"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
