import { createApp } from "./app.js";

const PORT = Number(process.env.PORT ?? 3000);

const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Retrying on port ${PORT + 1}...`,
    );
    server.close();
    app.listen(PORT + 1, () => {
      console.log(`Server running on http://localhost:${PORT + 1}`);
    });
  } else {
    console.error("Server error:", err);
    process.exit(1);
  }
});
