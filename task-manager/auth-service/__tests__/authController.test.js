// __tests__/authController.test.js
const request = require("supertest");
const express = require("express");
const app = express();
const authRoutes = require("../routes/authRoutes");
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Mock des modules externes
jest.mock("../config/db", () => ({
  query: jest.fn(),
}));

jest.mock("bcryptjs", () => ({
  genSaltSync: jest.fn(() => "salt"),
  hashSync: jest.fn((password) => `hashed-${password}`),
  compareSync: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(() => "fake-jwt-token"),
  verify: jest.fn(),
}));

app.use(express.json());
app.use("/api/auth", authRoutes);

describe("Auth Controller Unit Tests", () => {

  // =====================
  // TEST REGISTER
  // =====================
  test("register - succès", async () => {
    db.query.mockImplementationOnce((query, values, cb) => cb(null, [])) // Vérif email
            .mockImplementationOnce((query, values, cb) => cb(null, { insertId: 1 })); // Insert user

    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "Ursulo", email: "ursulo@test.com", password: "123456" });

    expect(res.status).toBe(201);
    expect(res.body.msg).toBe("Utilisateur créé avec succès !");
  });

  test("register - email déjà utilisé", async () => {
    db.query.mockImplementationOnce((query, values, cb) => cb(null, [{ id: 1 }])); // Email exists

    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "Ursulo", email: "ursulo@test.com", password: "123456" });

    expect(res.status).toBe(400);
    expect(res.body.msg).toBe("Email déjà utilisé");
  });

  test("register - champs manquants", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "Ursulo" });

    expect(res.status).toBe(400);
    expect(res.body.msg).toBe("Tous les champs sont obligatoires");
  });

  // =====================
  // TEST LOGIN
  // =====================
  test("login - succès", async () => {
    db.query.mockImplementationOnce((query, values, cb) => cb(null, [{ id: 1, username: "Ursulo", email: "ursulo@test.com", password: "hashed-123456" }]));
    bcrypt.compareSync.mockReturnValue(true);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ursulo@test.com", password: "123456" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe("fake-jwt-token");
    expect(res.body.user.username).toBe("Ursulo");
  });

  test("login - utilisateur non trouvé", async () => {
    db.query.mockImplementationOnce((query, values, cb) => cb(null, [])); // aucun utilisateur

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "unknown@test.com", password: "123456" });

    expect(res.status).toBe(400);
    expect(res.body.msg).toBe("Utilisateur non trouvé");
  });

  test("login - mot de passe incorrect", async () => {
    db.query.mockImplementationOnce((query, values, cb) => cb(null, [{ id: 1, username: "Ursulo", email: "ursulo@test.com", password: "hashed-123456" }]));
    bcrypt.compareSync.mockReturnValue(false);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ursulo@test.com", password: "wrongpass" });

    expect(res.status).toBe(400);
    expect(res.body.msg).toBe("Mot de passe incorrect");
  });

});
