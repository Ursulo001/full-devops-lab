import { useEffect, useState } from "react";
//const auth_url = process.env.SERV_AUTH_URL;
//const task_url = process.env.SERV_TASK_URL;

export default function ApiTest() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/auth-api/") // endpoint de test
      .then((res) => res.json())
      .then((data) => setMessage(data.msg))
      .catch((err) => setMessage("Erreur : " + err.message));
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Test Backend</h1>
      <p>{message}</p>
    </div>
  );
}
