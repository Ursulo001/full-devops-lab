const db = require("../config/db");

// CREATE TASK
exports.createTask = (req, res) => {
  const { title, description } = req.body;
  const userId = req.user.id;

  if (!title) {
    return res.status(400).json({ msg: "Le titre est obligatoire" });
  }

  const sql = "INSERT INTO tasks (user_id, title, description) VALUES (?, ?, ?)";
  db.query(sql, [userId, title, description], (err, result) => {
    if (err) return res.status(500).json({ msg: err.message });

    res.status(201).json({
      msg: "Tâche créée avec succès",
      task: {
        id: result.insertId,
        user_id: userId,
        title,
        description,
      },
    });
  });
};

// GET TASKS
exports.getTasks = (req, res) => {
  const userId = req.user.id;

  const sql = "SELECT * FROM tasks WHERE user_id = ?";
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ msg: err.message });
    res.json({ tasks: results });
  });
};

// UPDATE TASK
exports.updateTask = (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;
  const { title, description, status } = req.body;

  if (!title && !description && !status) {
    return res.status(400).json({ msg: "Rien à mettre à jour" });
  }

  let fields = [];
  let values = [];

  if (title) {
    fields.push("title = ?");
    values.push(title);
  }
  if (description) {
    fields.push("description = ?");
    values.push(description);
  }
  if (status) {
    fields.push("status = ?");
    values.push(status);
  }

  values.push(userId, taskId);

  const sql = `UPDATE tasks SET ${fields.join(", ")} WHERE user_id = ? AND id = ?`;
  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ msg: err.message });
    if (result.affectedRows === 0)
      return res.status(404).json({ msg: "Tâche non trouvée" });

    res.json({ msg: "Tâche mise à jour avec succès" });
  });
};

// DELETE TASK
exports.deleteTask = (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;

  const sql = "DELETE FROM tasks WHERE id = ? AND user_id = ?";
  db.query(sql, [taskId, userId], (err, result) => {
    if (err) return res.status(500).json({ msg: err.message });

    if (result.affectedRows === 0)
      return res.status(404).json({ msg: "Tâche non trouvée ou non autorisée" });

    res.json({ msg: "Tâche supprimée avec succès" });
  });
};
