const request = require("supertest");
const express = require("express");
const app = express();
const taskRoutes = require("../routes/taskRoutes");
const db = require("../config/db");
const jwt = require("jsonwebtoken");

jest.mock("../config/db", () => ({
  query: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
}));

app.use(express.json());
app.use("/api/tasks", taskRoutes);

describe("Task Controller Unit Tests", () => {

  beforeEach(() => {
    // Simule un utilisateur authentifié
    jwt.verify.mockReturnValue({ id: 1, username: "Ursulo" });
  });

  // ====================
  // CREATE TASK
  // ====================
  test("createTask - succès", async () => {
    db.query.mockImplementationOnce((sql, values, callback) => {
      callback(null, { insertId: 10 });
    });

    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", "Bearer fake-token")
      .send({ title: "Tâche importante", description: "Détails..." });

    expect(res.status).toBe(201);
    expect(res.body.task.id).toBe(10);
    expect(res.body.task.title).toBe("Tâche importante");
  });

  test("createTask - titre manquant", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", "Bearer fake-token")
      .send({ description: "Pas de titre" });

    expect(res.status).toBe(400);
    expect(res.body.msg).toBe("Le titre est obligatoire");
  });

  // ====================
  // GET TASKS
  // ====================
  test("getTasks - succès", async () => {
    db.query.mockImplementationOnce((sql, values, callback) => {
      callback(null, [
        { id: 1, title: "T1", description: "D1" },
        { id: 2, title: "T2", description: "D2" }
      ]);
    });

    const res = await request(app)
      .get("/api/tasks")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body.tasks.length).toBe(2);
  });

  // ====================
  // UPDATE TASK
  // ====================
  test("updateTask - succès", async () => {
    db.query.mockImplementationOnce((sql, values, callback) => {
      callback(null, { affectedRows: 1 });
    });

    const res = await request(app)
      .put("/api/tasks/1")
      .set("Authorization", "Bearer fake-token")
      .send({ title: "Nouveau titre" });

    expect(res.status).toBe(200);
    expect(res.body.msg).toBe("Tâche mise à jour avec succès");
  });

  test("updateTask - tâche non trouvée", async () => {
    db.query.mockImplementationOnce((sql, values, callback) => {
      callback(null, { affectedRows: 0 });
    });

    const res = await request(app)
      .put("/api/tasks/99")
      .set("Authorization", "Bearer fake-token")
      .send({ title: "Test" });

    expect(res.status).toBe(404);
    expect(res.body.msg).toBe("Tâche non trouvée");
  });

  // ====================
  // DELETE TASK
  // ====================
  test("deleteTask - succès", async () => {
    db.query.mockImplementationOnce((sql, values, callback) => {
      callback(null, { affectedRows: 1 });
    });

    const res = await request(app)
      .delete("/api/tasks/1")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body.msg).toBe("Tâche supprimée avec succès");
  });

  test("deleteTask - tâche inexistante", async () => {
    db.query.mockImplementationOnce((sql, values, callback) => {
      callback(null, { affectedRows: 0 });
    });

    const res = await request(app)
      .delete("/api/tasks/99")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(404);
    expect(res.body.msg).toBe("Tâche non trouvée ou non autorisée");
  });

});
