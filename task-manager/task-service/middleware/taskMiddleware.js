const jwt = require("jsonwebtoken");

// Middleware pour vérifier le token JWT avant d'accéder aux routes des tâches
const taskMiddleware = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ msg: "Aucun token fourni" });
  }

  // Format attendu : "Bearer <token>"
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ msg: "Token manquant" });
  }

  try {
    // Vérifie et décode le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // On ajoute l'utilisateur décodé à la requête
    req.user = { id: decoded.id, username: decoded.username };

    next();
  } catch (err) {
    return res.status(403).json({ msg: "Token invalide ou expiré" });
  }
};

module.exports = taskMiddleware;
